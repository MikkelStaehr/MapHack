import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e0e",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path
            d="M 14 48 Q 22 22 32 30 T 50 14"
            fill="none"
            stroke="#d4ff3a"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="48" r="5" fill="#6dffb0" />
          <circle cx="50" cy="14" r="5" fill="#ff5a5a" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
