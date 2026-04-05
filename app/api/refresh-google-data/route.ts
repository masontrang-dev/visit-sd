import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Vercel Cron: biweekly on 1st and 15th at 6 AM UTC
// See vercel.json: { "crons": [{ "path": "/api/refresh-google-data", "schedule": "0 6 1,15 * *" }] }
export const dynamic = "force-dynamic";

type PlaceDetails = {
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  current_opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
};

async function fetchPlaceDetails(placeId: string): Promise<{ result?: PlaceDetails; status: string }> {
  const fields = "rating,user_ratings_total,opening_hours,current_opening_hours,photos";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${googleApiKey}`;
  const res = await fetch(url);
  return res.json();
}

function buildPhotoUrl(photoReference: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${googleApiKey}`;
}

export async function POST(req: NextRequest) {
  // Verify this is an admin request or a Vercel Cron request
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const sessionCookie = req.cookies.get("admin_session");
  const isAdmin = !!sessionCookie?.value;

  if (!isVercelCron && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!googleApiKey) {
    return NextResponse.json({ error: "Google API key not configured" }, { status: 500 });
  }

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, place_id, photo_url")
    .not("place_id", "is", null)
    .neq("place_id", "");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch restaurants" }, { status: 500 });
  }

  const results: Array<{ name: string; status: string }> = [];

  for (const restaurant of restaurants) {
    try {
      const response = await fetchPlaceDetails(restaurant.place_id);

      if (response.status !== "OK") {
        results.push({ name: restaurant.name, status: `error: ${response.status}` });
        continue;
      }

      const details = response.result;
      if (!details) {
        results.push({ name: restaurant.name, status: "no result" });
        continue;
      }

      const openingHours = details.opening_hours || details.current_opening_hours;

      // Build storefront photo URL from first Google photo
      const storefrontPhotoUrl = details.photos?.[0]?.photo_reference
        ? buildPhotoUrl(details.photos[0].photo_reference)
        : null;

      const updateData: Record<string, unknown> = {
        google_rating: details.rating ?? null,
        google_review_count: details.user_ratings_total ?? null,
        is_open_now: openingHours?.open_now ?? null,
        hours_text: openingHours?.open_now != null
          ? openingHours.open_now ? "Open now" : "Closed"
          : null,
        opening_hours: openingHours
          ? {
              weekday_text: openingHours.weekday_text || [],
              periods: openingHours.periods || [],
            }
          : null,
      };

      // Always refresh storefront photo (photo_references expire)
      if (storefrontPhotoUrl) {
        updateData.storefront_photo_url = storefrontPhotoUrl;
      }

      const { error: updateError } = await supabase
        .from("restaurants")
        .update(updateData)
        .eq("id", restaurant.id);

      if (updateError) {
        results.push({ name: restaurant.name, status: `db error: ${updateError.message}` });
      } else {
        results.push({ name: restaurant.name, status: "updated" });
      }
    } catch {
      results.push({ name: restaurant.name, status: "fetch error" });
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  const updated = results.filter((r) => r.status === "updated").length;
  const failed = results.filter((r) => r.status !== "updated").length;

  return NextResponse.json({
    total: restaurants.length,
    updated,
    failed,
    results,
  });
}
