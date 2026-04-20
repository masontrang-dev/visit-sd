import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon1() {
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
          borderRadius: 36,
        }}
      >
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
              fontSize: 60,
              fontWeight: 700,
              color: "#fafaf8",
              letterSpacing: "-0.02em",
              fontFamily: "sans-serif",
            }}
          >
            VISIT
          </span>
          <span
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#d85a30",
              letterSpacing: "-0.02em",
              fontFamily: "sans-serif",
            }}
          >
            SD
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
