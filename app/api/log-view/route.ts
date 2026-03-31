import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, referrer, user_agent } = body;

    // Get IP address from request headers
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      null;

    // Detect device type from user agent
    const deviceType = user_agent ? getDeviceType(user_agent) : null;

    // Get geolocation data from IP
    let country = null;
    let region = null;
    let city = null;

    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        // Use ipapi.co free tier (1000 requests/day)
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: {
            "User-Agent": "visit-sd/1.0",
          },
        });

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          country = geoData.country_name || null;
          region = geoData.region || null;
          city = geoData.city || null;
        }
      } catch (error) {
        console.error("Geolocation lookup failed:", error);
      }
    }

    // Insert page view with all data
    const { error } = await supabase.from("page_views").insert([
      {
        path,
        referrer,
        user_agent,
        ip_address: ip,
        country,
        region,
        city,
        device_type: deviceType,
      },
    ]);

    if (error) {
      console.error("Failed to log page view:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
