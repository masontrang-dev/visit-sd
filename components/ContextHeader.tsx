"use client";

type Props = {
  activeCuisines: string[];
  activeNeighborhoods: string[];
  activeOccasions?: string[];
  searchQuery?: string;
  matchCount: number;
  totalCount: number;
};

export default function ContextHeader({
  activeCuisines,
  activeNeighborhoods,
  activeOccasions = [],
  searchQuery,
  matchCount,
  totalCount,
}: Props) {
  const filters = [
    ...activeCuisines,
    ...activeNeighborhoods,
    ...activeOccasions,
  ].filter(Boolean);

  const filterText = filters.join(" · ");

  return (
    <div className="px-6 pt-3 pb-2 border-b-2 border-txt bg-bg">
      <p className="text-2xs tracking-wide uppercase text-accent font-medium mb-0.5">
        Showing results for
      </p>
      <h2 className="font-display text-[32px] leading-none tracking-tight text-txt">
        {filterText || "All spots"}
      </h2>
      <p className="text-xs text-txt2 mt-1">
        {matchCount} spot{matchCount !== 1 ? "s" : ""} match · sorted by my rating
      </p>
    </div>
  );
}
