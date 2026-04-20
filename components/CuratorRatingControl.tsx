"use client";

type Props = {
  ratingsCount: number;
  avg: number | null;
  loaded: boolean;
  expanded: boolean;
  onToggle: () => void;
  hasDetails: boolean;
};

export default function CuratorRatingControl({
  ratingsCount,
  avg,
  loaded,
  expanded,
  onToggle,
  hasDetails,
}: Props) {
  if (!loaded) {
    return (
      <div className="flex-1 text-center py-3 px-3">
        <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-accent mb-1">
          —
        </div>
        <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
          Curators&rsquo; rating
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 py-3 px-3">
      <button
        type="button"
        onClick={() => hasDetails && onToggle()}
        disabled={!hasDetails}
        className={`w-full text-center bg-transparent border-none p-0 ${
          hasDetails ? "cursor-pointer" : "cursor-default"
        }`}
        aria-expanded={expanded}
      >
        <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-accent mb-1">
          {avg !== null ? `${avg}/5` : "—"}
        </div>
        <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
          Curators&rsquo; rating
        </div>
        <div className="text-2xs text-txt2 opacity-60 flex items-center justify-center gap-1">
          <span>
            {ratingsCount} curator{ratingsCount !== 1 ? "s" : ""}
          </span>
          {hasDetails && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}
