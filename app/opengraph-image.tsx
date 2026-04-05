import { ImageResponse } from "next/og";

export const alt = "VISIT SD — Our San Diego Picks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a18",
          position: "relative",
        }}
      >
        {/* Corner accents */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            width: 60,
            height: 60,
            borderTop: "3px solid #d85a30",
            borderLeft: "3px solid #d85a30",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 32,
            width: 60,
            height: 60,
            borderBottom: "3px solid #1d9e75",
            borderRight: "3px solid #1d9e75",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            lineHeight: 0.85,
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontWeight: 700,
              color: "#fafaf8",
              letterSpacing: "-0.02em",
            }}
          >
            VISIT
          </span>
          <span
            style={{
              fontSize: 160,
              fontWeight: 700,
              color: "#d85a30",
              letterSpacing: "-0.02em",
            }}
          >
            SD
          </span>
        </div>
        <p style={{ fontSize: 24, color: "#a8a7a3", marginTop: 24 }}>
          Our go-to spots for visitors & friends
        </p>
      </div>
    ),
    { ...size },
  );
}
