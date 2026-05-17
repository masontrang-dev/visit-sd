import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

const ALLOWED_EVENT_TYPES = new Set(["outbound_click", "search"]);

// Per-IP in-memory rate limiter. Single-instance scope — on Vercel each
// serverless instance has its own counter. Good enough to stop casual abuse;
// swap for Upstash Ratelimit if distributed enforcement becomes necessary.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    if (rateLimitBuckets.size > 5000) {
      for (const [key, value] of rateLimitBuckets) {
        if (value.resetAt <= now) rateLimitBuckets.delete(key);
      }
    }
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}

async function enrichWithGeolocation(pageViewId: number, ip: string) {
  try {
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "visit-sd/1.0" },
    });
    if (!geoResponse.ok) return;
    const geoData = await geoResponse.json();
    await supabase
      .from("page_views")
      .update({
        country: geoData.country_name || null,
        region: geoData.region || null,
        city: geoData.city || null,
      })
      .eq("id", pageViewId);
  } catch (error) {
    console.error("Geolocation enrichment failed:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    if (ip && !checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const {
      path,
      referrer,
      user_agent,
      session_id,
      event_type,
      event_label,
    } = body;

    const deviceType = user_agent ? getDeviceType(user_agent) : null;

    const safeEventType =
      typeof event_type === "string" && ALLOWED_EVENT_TYPES.has(event_type)
        ? event_type
        : null;
    const safeEventLabel =
      safeEventType && typeof event_label === "string"
        ? event_label.slice(0, 500)
        : null;
    const safeSessionId =
      typeof session_id === "string" && session_id.length <= 64
        ? session_id
        : null;

    // Insert immediately without geolocation so the response isn't blocked
    // on a third-party HTTP call. Geo data is filled in via `after()`.
    const { data, error } = await supabase
      .from("page_views")
      .insert([
        {
          path,
          referrer,
          user_agent,
          ip_address: ip,
          device_type: deviceType,
          session_id: safeSessionId,
          event_type: safeEventType,
          event_label: safeEventLabel,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log page view:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (ip && ip !== "127.0.0.1" && ip !== "::1" && data?.id) {
      after(enrichWithGeolocation(data.id, ip));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in log-view route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
