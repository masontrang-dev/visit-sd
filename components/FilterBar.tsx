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
  viewMode?: "list" | "map";
  onViewModeChange?: (mode: "list" | "map") => void;
  mustTryFilter?: boolean;
  onMustTryFilterChange?: (v: boolean) => void;
  isAdminView?: boolean;
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
  viewMode,
  onViewModeChange,
  mustTryFilter,
  onMustTryFilterChange,
  isAdminView,
}: Props) {
  return (
    <>
      {/* Cuisine filter row */}
      <div className="flex gap-1.5 py-3 px-6 border-b border-brd flex-wrap items-center">
        <span className="text-[11px] tracking-[0.12em] uppercase font-medium text-txt2 mr-2">
          Cuisine
        </span>
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
      </div>

      {/* Controls row */}
      <div className="flex gap-1.5 py-3 px-6 border-b border-brd flex-wrap items-center">
        <span className="text-[11px] tracking-[0.12em] uppercase font-medium text-txt2 mr-2">
          View
        </span>

        {onViewModeChange && (
          <div className="flex gap-1">
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

        {onAdd && (
          <button
            onClick={onAdd}
            className="font-body text-[13px] font-medium py-1.5 px-[18px] rounded-pill border-none bg-accent text-white cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {/* Neighborhood filter row */}
      {neighborhoods && neighborhoods.length > 0 && onNeighborhoodChange && (
        <div className="flex gap-1.5 py-3 px-6 border-b border-brd flex-wrap items-center">
          <span className="text-[11px] tracking-[0.12em] uppercase font-medium text-txt2 mr-2">
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
