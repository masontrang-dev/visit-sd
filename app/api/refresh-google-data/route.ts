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
  userRatingCount?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  };
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  };
};

const PLACE_FIELDS = [
  "rating",
  "userRatingCount",
  "regularOpeningHours",
  "currentOpeningHours",
].join(",");

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask": PLACE_FIELDS,
    },
  });
  if (!res.ok) return null;
  return res.json();
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
    .select("id, name, place_id")
    .not("place_id", "is", null)
    .neq("place_id", "");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch restaurants" }, { status: 500 });
  }

  const results: Array<{ name: string; status: string }> = [];

  for (const restaurant of restaurants) {
    try {
      const details = await fetchPlaceDetails(restaurant.place_id);

      if (!details) {
        results.push({ name: restaurant.name, status: "fetch failed" });
        continue;
      }

      const openingHours = details.regularOpeningHours || details.currentOpeningHours;

      const updateData: Record<string, unknown> = {
        google_rating: details.rating ?? null,
        google_review_count: details.userRatingCount ?? null,
        opening_hours: openingHours
          ? {
              weekday_text: openingHours.weekdayDescriptions || [],
              periods: openingHours.periods || [],
            }
          : null,
      };

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
