"use client";

import { useState, useEffect, useRef } from "react";

export type ImageDisplayMode = "full" | "compact" | "none";

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
  activePrices?: string[];
  onPriceChange?: (prices: string[]) => void;
  isAdminView?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  imageDisplayMode?: ImageDisplayMode;
  onImageDisplayModeChange?: (mode: ImageDisplayMode) => void;
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
  activePrices,
  onPriceChange,
  isAdminView,
  searchQuery,
  onSearchChange,
  imageDisplayMode,
  onImageDisplayModeChange,
}: Props) {
  const [activePanel, setActivePanel] = useState<
    "cuisine" | "area" | "price" | null
  >(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close panel on clicks outside the filter bar
  useEffect(() => {
    if (!activePanel) return;
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activePanel]);

  const hasCuisineFilter = activeCuisines.length > 0;
  const hasAreaFilter = (activeNeighborhoods ?? []).length > 0;
  const hasPriceFilter = (activePrices ?? []).length > 0;
  const panelOpen = activePanel !== null;
  const hasAnyFilter =
    hasCuisineFilter || hasAreaFilter || hasPriceFilter || mustTryFilter;

  function handleClearAll() {
    onCuisineChange([]);
    if (onNeighborhoodChange) onNeighborhoodChange([]);
    if (onPriceChange) onPriceChange([]);
    if (onMustTryFilterChange) onMustTryFilterChange(false);
  }

  function removeFilter(type: "cuisine" | "area" | "price", value: string) {
    if (type === "cuisine") {
      onCuisineChange(activeCuisines.filter((c) => c !== value));
    } else if (type === "area" && onNeighborhoodChange) {
      onNeighborhoodChange(
        (activeNeighborhoods ?? []).filter((n) => n !== value),
      );
    } else if (type === "price" && onPriceChange) {
      onPriceChange((activePrices ?? []).filter((p) => p !== value));
    }
  }

  return (
    <div
      ref={barRef}
      className={`sticky top-0 z-10 bg-bg isolate transition-[border-color] duration-200 ${isScrolled ? "border-b-2 border-txt" : "border-b-2 border-transparent"}`}
    >
      {/* Row 1: Search + Add */}
      <div className="flex gap-2 pt-3 pb-2 px-6 items-center flex-wrap">
        {onSearchChange != null && (
          <input
            type="text"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search restaurants, dishes, areas..."
            className="input-base !py-2 !px-3.5 !rounded-none !text-sm flex-1 min-w-0 !bg-bg2 !border-brd placeholder:text-txt2 placeholder:opacity-60"
          />
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

      {/* Row 2: View toggle + Must Try */}
      <div className="flex gap-2 pb-2 px-6 items-center justify-between flex-wrap">
        <div className="flex gap-2 items-center">
          {/* View mode toggle */}
          {onViewModeChange && (
            <>
              <span className="text-2xs font-medium text-txt2 uppercase tracking-wide">
                View:
              </span>
              <div className="flex gap-1">
                <button
                  className={viewMode === "list" ? "chip-active" : "chip"}
                  onClick={() => {
                    if (viewMode === "list" && onImageDisplayModeChange) {
                      // Cycle through image display modes when already in list view
                      const modes: ImageDisplayMode[] = [
                        "full",
                        "compact",
                        "none",
                      ];
                      const currentIndex = modes.indexOf(
                        imageDisplayMode || "full",
                      );
                      const nextIndex = (currentIndex + 1) % modes.length;
                      onImageDisplayModeChange(modes[nextIndex]);
                    } else {
                      // Switch to list view
                      onViewModeChange("list");
                    }
                  }}
                  title={
                    viewMode === "list"
                      ? `List view: ${imageDisplayMode === "full" ? "Full images" : imageDisplayMode === "compact" ? "Compact images" : "No images"} (click to cycle)`
                      : "Switch to list view"
                  }
                >
                  {viewMode === "list"
                    ? imageDisplayMode === "full"
                      ? "Full 🖼️"
                      : imageDisplayMode === "compact"
                        ? "Compact ▢"
                        : "List ☰"
                    : "List ☰"}
                </button>
                <button
                  className={viewMode === "map" ? "chip-active" : "chip"}
                  onClick={() => onViewModeChange("map")}
                  title="Switch to map view"
                >
                  Map
                </button>
              </div>
            </>
          )}
        </div>

        {/* Must-Try button on the right */}
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

      {/* Row 3: Filter buttons and active filter pills */}
      <div className="flex gap-2 pb-3 px-6 items-center flex-wrap">
        <span className="text-2xs font-medium text-txt2 uppercase tracking-wide">
          Filters:
        </span>
        {/* Active filter pills */}
        {activeCuisines.map((cuisine) => (
          <button
            key={`active-cuisine-${cuisine}`}
            onClick={() => removeFilter("cuisine", cuisine)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            {cuisine}
            <span className="text-xs">✕</span>
          </button>
        ))}
        {(activeNeighborhoods ?? []).map((area) => (
          <button
            key={`active-area-${area}`}
            onClick={() => removeFilter("area", area)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            {area}
            <span className="text-xs">✕</span>
          </button>
        ))}
        {(activePrices ?? []).map((price) => (
          <button
            key={`active-price-${price}`}
            onClick={() => removeFilter("price", price)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            {price}
            <span className="text-xs">✕</span>
          </button>
        ))}

        {/* Filter dropdown buttons (only show if not active) */}
        {/* Cuisine toggle - only show if no active cuisines */}
        {!hasCuisineFilter && (
          <button
            className={`chip flex items-center gap-1.5 ${activePanel === "cuisine" ? "!border-txt !bg-txt !text-bg" : ""}`}
            onClick={() =>
              setActivePanel(activePanel === "cuisine" ? null : "cuisine")
            }
          >
            Cuisine
            <span
              className={`text-2xs transition-transform duration-[0.12s] ${activePanel === "cuisine" ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>
        )}

        {/* Area toggle - only show if no active areas */}
        {neighborhoods &&
          neighborhoods.length > 0 &&
          onNeighborhoodChange &&
          !hasAreaFilter && (
            <button
              className={`chip flex items-center gap-1.5 ${activePanel === "area" ? "!border-txt !bg-txt !text-bg" : ""}`}
              onClick={() =>
                setActivePanel(activePanel === "area" ? null : "area")
              }
            >
              Area
              <span
                className={`text-2xs transition-transform duration-[0.12s] ${activePanel === "area" ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
          )}

        {/* Price toggle - only show if no active prices */}
        {onPriceChange && !hasPriceFilter && (
          <button
            className={`chip flex items-center gap-1.5 ${activePanel === "price" ? "!border-txt !bg-txt !text-bg" : ""}`}
            onClick={() =>
              setActivePanel(activePanel === "price" ? null : "price")
            }
          >
            Price
            <span
              className={`text-2xs transition-transform duration-[0.12s] ${activePanel === "price" ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>
        )}

        {/* Clear all link */}
        {hasAnyFilter && (
          <button
            onClick={handleClearAll}
            className="text-2xs font-medium text-accent bg-transparent border-none cursor-pointer px-1 py-0.5 transition-opacity duration-150 hover:opacity-70"
          >
            Clear all
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
                {activePanel === "cuisine"
                  ? "Cuisine"
                  : activePanel === "area"
                    ? "Area"
                    : "Price"}
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

            {/* Price chips */}
            {activePanel === "price" && onPriceChange && (
              <div className="flex gap-1.5 flex-wrap items-center">
                <button
                  className={!hasPriceFilter ? "chip-active" : "chip"}
                  onClick={() => onPriceChange([])}
                >
                  All
                </button>
                {["$", "$$", "$$$", "$$$$"].map((p) => (
                  <button
                    key={p}
                    className={
                      (activePrices ?? []).includes(p) ? "chip-active" : "chip"
                    }
                    onClick={() =>
                      onPriceChange(toggleItem(activePrices ?? [], p))
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shadow — absolutely positioned so it's not clipped */}
      {panelOpen && (
        <div
          className="absolute left-0 right-0 bottom-0 h-6 pointer-events-none translate-y-full transition-opacity duration-200"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)",
          }}
        />
      )}
    </div>
  );
}
