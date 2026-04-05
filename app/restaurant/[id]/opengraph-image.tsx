import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const alt = "Restaurant on VISIT SD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CUISINE_COLORS = [
  "#d85a30", "#1d9e75", "#2d7dd2", "#9b5de5", "#c4663a",
  "#00856a", "#d4584a", "#5a7d4f", "#b07c3b", "#7c6992",
];

function cuisineColorIndex(cuisine: string): number {
  let hash = 0;
  for (let i = 0; i < cuisine.length; i++) {
    hash = (hash << 5) - hash + cuisine.charCodeAt(i);
  }
  return Math.abs(hash) % CUISINE_COLORS.length;
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", parseInt(id))
    .single();

  if (!restaurant) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a18",
          }}
        >
          <span style={{ fontSize: 80, fontWeight: 700, color: "#fafaf8" }}>
            VISIT SD
          </span>
        </div>
      ),
      { ...size },
    );
  }

  const cuisineColor = restaurant.cuisine
    ? CUISINE_COLORS[cuisineColorIndex(restaurant.cuisine)]
    : CUISINE_COLORS[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#1a1a18",
          position: "relative",
        }}
      >
        {/* Photo (left half) */}
        {(restaurant.photo_url || restaurant.storefront_photo_url) && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "50%",
              height: "100%",
              display: "flex",
            }}
          >
            <img
              src={(restaurant.photo_url || restaurant.storefront_photo_url)!}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to right, transparent 40%, #1a1a18)",
                display: "flex",
              }}
            />
          </div>
        )}

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 60,
            marginLeft: (restaurant.photo_url || restaurant.storefront_photo_url) ? "50%" : "0",
            width: (restaurant.photo_url || restaurant.storefront_photo_url) ? "50%" : "100%",
          }}
        >
          {/* Cuisine badge */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: cuisineColor,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {restaurant.cuisine}
            </span>
            {restaurant.must_try && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: "#d85a30",
                  padding: "4px 12px",
                  borderRadius: 20,
                  marginLeft: 12,
                }}
              >
                ★ Must-Try
              </span>
            )}
          </div>

          {/* Name */}
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#fafaf8",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          >
            {restaurant.name}
          </span>

          {/* Neighborhood + Price */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}
          >
            <span style={{ fontSize: 20, color: "#a8a7a3" }}>
              {restaurant.neighborhood}
            </span>
            <span style={{ fontSize: 20, color: "#5f5e5a" }}>·</span>
            <span style={{ fontSize: 20, color: "#a8a7a3" }}>
              {restaurant.price}
            </span>
          </div>

          {/* Watermark */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#5f5e5a",
                letterSpacing: "0.1em",
              }}
            >
              VISIT SD
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
