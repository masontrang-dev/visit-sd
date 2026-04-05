"use client";

export default function IllustrationEmpty({ className = "" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Plate */}
      <circle cx="60" cy="62" r="38" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="60" cy="62" r="26" stroke="var(--brd)" strokeWidth="1" />
      {/* Fork (left) */}
      <g stroke="var(--accent2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="36" y1="28" x2="36" y2="56" />
        <line x1="32" y1="28" x2="32" y2="40" />
        <line x1="40" y1="28" x2="40" y2="40" />
        <line x1="32" y1="40" x2="40" y2="40" />
      </g>
      {/* Knife (right) */}
      <g stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="84" y1="28" x2="84" y2="56" />
        <path d="M84 28 C84 28 89 32 89 38 C89 43 84 43 84 43" />
      </g>
    </svg>
  );
}
