"use client";

import { useState } from "react";

type Props = {
  cuisines: string[];
  active: string;
  onChange: (f: string) => void;
  neighborhoods?: string[];
  activeNeighborhood?: string;
  onNeighborhoodChange?: (f: string) => void;
  onAdd?: () => void;
  showAdmin?: boolean;
  viewMode?: "list" | "map";
  onViewModeChange?: (mode: "list" | "map") => void;
  mustTryFilter?: boolean;
  onMustTryFilterChange?: (v: boolean) => void;
  showCopyLink?: boolean;
};

const btnBase =
  "font-body text-[13px] font-medium py-1.5 px-3.5 rounded-pill border-[1.5px] border-brd bg-transparent cursor-pointer text-txt2 transition-all duration-[0.12s] whitespace-nowrap";
const btnActive =
  "font-body text-[13px] font-medium py-1.5 px-3.5 rounded-pill border-[1.5px] border-txt bg-txt cursor-pointer text-bg transition-all duration-[0.12s] whitespace-nowrap";

export default function FilterBar({
  cuisines,
  active,
  onChange,
  neighborhoods,
  activeNeighborhood,
  onNeighborhoodChange,
  onAdd,
  showAdmin,
  viewMode,
  onViewModeChange,
  mustTryFilter,
  onMustTryFilterChange,
  showCopyLink,
}: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <>
      <div className="flex gap-1.5 py-3.5 px-6 border-b border-brd flex-wrap items-center overflow-x-auto">
        <button
          className={active === "all" ? btnActive : btnBase}
          onClick={() => onChange("all")}
        >
          All
        </button>
        {cuisines.map((c) => (
          <button
            key={c}
            className={active === c ? btnActive : btnBase}
            onClick={() => onChange(c)}
          >
            {c}
          </button>
        ))}
        {onMustTryFilterChange && (
          <button
            className={
              mustTryFilter
                ? "font-body text-[13px] font-medium py-1.5 px-3.5 rounded-pill border-[1.5px] border-accent bg-accent cursor-pointer text-white transition-all duration-[0.12s] whitespace-nowrap"
                : btnBase
            }
            onClick={() => onMustTryFilterChange(!mustTryFilter)}
          >
            ★ Must-Try
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="font-body ml-auto text-[13px] font-medium py-1.5 px-[18px] rounded-pill border-none bg-accent text-white cursor-pointer"
          >
            + Add restaurant
          </button>
        )}
        {onViewModeChange && (
          <div className={`flex gap-1 ${onAdd || showAdmin ? "" : "ml-auto"}`}>
            <button
              className={viewMode === "list" ? btnActive : btnBase}
              onClick={() => onViewModeChange("list")}
            >
              List
            </button>
            <button
              className={viewMode === "map" ? btnActive : btnBase}
              onClick={() => onViewModeChange("map")}
            >
              Map
            </button>
          </div>
        )}
        {showCopyLink && (
          <button
            className={`${btnBase} ${onAdd ? "" : "ml-auto"}`}
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        )}
        {showAdmin && (
          <a
            href="/admin"
            className="ml-auto font-body text-xs text-txt2 no-underline py-1.5 opacity-50"
          >
            Admin ↗
          </a>
        )}
      </div>
      {neighborhoods && neighborhoods.length > 0 && onNeighborhoodChange && (
        <div className="flex gap-1.5 py-2 px-6 pb-3.5 border-b border-brd flex-wrap items-center overflow-x-auto">
          <span className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mr-1">
            Area
          </span>
          <button
            className={activeNeighborhood === "all" ? btnActive : btnBase}
            onClick={() => onNeighborhoodChange("all")}
          >
            All
          </button>
          {neighborhoods.map((n) => (
            <button
              key={n}
              className={activeNeighborhood === n ? btnActive : btnBase}
              onClick={() => onNeighborhoodChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
