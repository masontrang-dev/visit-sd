"use client";

export default function IllustrationNoVisits({ className = "" }: { className?: string }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Dotted trail */}
      <path
        d="M18 62 Q28 48 38 53 Q48 58 55 44"
        stroke="var(--brd)"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      {/* Map pin */}
      <path
        d="M40 14 C31.5 14 25 20.5 25 28.5 C25 39 40 52 40 52 C40 52 55 39 55 28.5 C55 20.5 48.5 14 40 14Z"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      {/* Inner dot */}
      <circle cx="40" cy="28.5" r="5" stroke="var(--accent2)" strokeWidth="1.5" />
    </svg>
  );
}
