"use client";

type Props = {
  ratingsCount: number;
  avg: number | null;
  loaded: boolean;
};

export default function CuratorRatingControl({
  ratingsCount,
  avg,
  loaded,
}: Props) {
  return (
    <div className="flex-1 text-center py-3 px-3">
      <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-accent mb-1">
        {loaded && avg !== null ? `${avg.toFixed(1)}/5` : "—"}
      </div>
      <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
        Curators&rsquo; rating
      </div>
      {loaded && (
        <div className="text-2xs text-txt2 opacity-60">
          {ratingsCount} curator{ratingsCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
