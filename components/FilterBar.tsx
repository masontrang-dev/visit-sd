"use client";

import { useState, useEffect } from "react";

type Props = {
  cuisines: string[];
  activeCuisines: string[];
  onCuisineChange: (f: string[]) => void;
  neighborhoods?: string[];
  activeNeighborhoods?: string[];
  onNeighborhoodChange?: (f: string[]) => void;
  onAdd?: () => void;
  viewMode?: "list" | "map";
  onViewModeChange?: (mode: "list" | "map") => void;
  mustTryFilter?: boolean;
  onMustTryFilterChange?: (v: boolean) => void;
  isAdminView?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
};

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function filterLabel(selected: string[], fallback: string): string {
  if (selected.length === 0) return fallback;
  if (selected.length === 1) return selected[0];
  return `${selected.length} selected`;
}

export default function FilterBar({
  cuisines,
  activeCuisines,
  onCuisineChange,
  neighborhoods,
  activeNeighborhoods,
  onNeighborhoodChange,
  onAdd,
  viewMode,
  onViewModeChange,
  mustTryFilter,
  onMustTryFilterChange,
  isAdminView,
  searchQuery,
  onSearchChange,
}: Props) {
  const [activePanel, setActivePanel] = useState<"cuisine" | "area" | null>(
    null,
  );

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasCuisineFilter = activeCuisines.length > 0;
  const hasAreaFilter = (activeNeighborhoods ?? []).length > 0;
  const panelOpen = activePanel !== null;

  return (
    <>
      {/* Sticky bar with two rows */}
      {/* Backdrop for click-outside-to-close — must be outside backdrop-blur parent */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-[9] bg-txt/5"
          onClick={() => setActivePanel(null)}
        />
      )}

      <div className={`sticky top-0 z-10 bg-bg isolate transition-[border-color] duration-200 ${isScrolled ? "border-b-2 border-txt" : "border-b-2 border-transparent"}`}>
        {/* Row 1: Search + View toggle + Add */}
        <div className="flex gap-2 pt-3 pb-2 px-6 items-center flex-wrap">
          {onSearchChange != null && (
            <input
              type="text"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="input-base !py-1.5 !px-3.5 !rounded-none !text-sm flex-1 min-w-0 placeholder:text-txt2 placeholder:opacity-50"
            />
          )}

          {onViewModeChange && (
            <div className="flex gap-1">
              <button
                className={viewMode === "list" ? "chip-active" : "chip"}
                onClick={() => onViewModeChange("list")}
              >
                List
              </button>
              <button
                className={viewMode === "map" ? "chip-active" : "chip"}
                onClick={() => onViewModeChange("map")}
              >
                Map
              </button>
            </div>
          )}

          {onAdd && (
            <button
              onClick={onAdd}
              className="btn-primary btn-pill !py-1.5 !px-[18px]"
            >
              + Add
            </button>
          )}
        </div>

        {/* Row 2: Filter buttons */}
        <div className="flex gap-2 pb-3 px-6 items-center flex-wrap">
          {/* Cuisine toggle */}
          <button
            className={`chip flex items-center gap-1.5 ${hasCuisineFilter || activePanel === "cuisine" ? "!border-txt !bg-txt !text-bg" : ""}`}
            onClick={() =>
              setActivePanel(activePanel === "cuisine" ? null : "cuisine")
            }
          >
            {filterLabel(activeCuisines, "Cuisine")}
            <span
              className={`text-2xs transition-transform duration-[0.12s] ${activePanel === "cuisine" ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>

          {/* Area toggle */}
          {neighborhoods && neighborhoods.length > 0 && onNeighborhoodChange && (
            <button
              className={`chip flex items-center gap-1.5 ${hasAreaFilter || activePanel === "area" ? "!border-txt !bg-txt !text-bg" : ""}`}
              onClick={() =>
                setActivePanel(activePanel === "area" ? null : "area")
              }
            >
              {filterLabel(activeNeighborhoods ?? [], "Area")}
              <span
                className={`text-2xs transition-transform duration-[0.12s] ${activePanel === "area" ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
          )}

          {/* Must-Try */}
          {onMustTryFilterChange && (
            <button
              className={
                mustTryFilter
                  ? "chip !border-accent !bg-accent !text-white"
                  : "chip"
              }
              onClick={() => onMustTryFilterChange(!mustTryFilter)}
            >
              ★ Must-Try
            </button>
          )}
        </div>

        {/* Slide-down panel */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-in-out bg-bg"
          style={{ gridTemplateRows: panelOpen ? "1fr" : "0fr" }}
        >
        <div className="overflow-hidden">
        <div className="py-3 px-6 max-h-[60vh] overflow-y-auto border-b-2 border-brd">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-body text-xs font-medium text-txt2 uppercase tracking-wide">
              {activePanel === "cuisine" ? "Cuisine" : "Area"}
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="btn-ghost !text-base text-txt2 hover:text-txt leading-none"
            >
              ✕
            </button>
          </div>

          {/* Cuisine chips */}
          {activePanel === "cuisine" && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <button
                className={!hasCuisineFilter ? "chip-active" : "chip"}
                onClick={() => onCuisineChange([])}
              >
                All
              </button>
              {cuisines.map((c) => (
                <button
                  key={c}
                  className={
                    activeCuisines.includes(c) ? "chip-active" : "chip"
                  }
                  onClick={() =>
                    onCuisineChange(toggleItem(activeCuisines, c))
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Area chips */}
          {activePanel === "area" &&
            neighborhoods &&
            onNeighborhoodChange && (
              <div className="flex gap-1.5 flex-wrap items-center">
                <button
                  className={!hasAreaFilter ? "chip-active" : "chip"}
                  onClick={() => onNeighborhoodChange([])}
                >
                  All
                </button>
                {neighborhoods.map((n) => (
                  <button
                    key={n}
                    className={
                      (activeNeighborhoods ?? []).includes(n)
                        ? "chip-active"
                        : "chip"
                    }
                    onClick={() =>
                      onNeighborhoodChange(
                        toggleItem(activeNeighborhoods ?? [], n),
                      )
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
        </div>
        </div>
        </div>

        {/* Shadow — absolutely positioned so it's not clipped */}
        <div
          className="absolute left-0 right-0 bottom-0 h-6 pointer-events-none translate-y-full transition-opacity duration-200"
          style={{ opacity: panelOpen ? 1 : 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)" }}
        />
      </div>
    </>
  );
}
