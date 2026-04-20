import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Maskable icon: keeps the logo inside the inner 80% safe zone so Android
// launchers can clip the outer ring without cropping the wordmark.
export default function IconMaskable() {
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
              fontSize: 120,
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
              fontSize: 150,
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
