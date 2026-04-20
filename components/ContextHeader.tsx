"use client";

type Props = {
  matchCount: number;
  totalCount: number;
};

export default function ContextHeader({ matchCount, totalCount }: Props) {
  const isFiltered = matchCount !== totalCount;
  return (
    <div className="min-w-0">
      <p className="text-2xs tracking-wide uppercase text-accent font-medium mb-0.5">
        Showing
      </p>
      <h2 className="font-display text-[28px] leading-[0.95] tracking-tight text-txt">
        <span className="tabular-nums">{matchCount}</span>{" "}
        {matchCount === 1 ? "result" : "results"}
      </h2>
      {isFiltered && (
        <p className="text-xs text-txt2 mt-1">of {totalCount} total</p>
      )}
    </div>
  );
}
