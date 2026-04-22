"use client";

import { useState, useEffect, useRef } from "react";
import { formatOccasion } from "@/lib/occasions";
import type { SortMode } from "@/hooks/useFilterState";

export type ImageDisplayMode = "full" | "compact" | "none";
export type VisibilityFilter = "public" | "private" | "archived" | "all";

const VISIBILITY_OPTIONS: VisibilityFilter[] = [
  "public",
  "private",
  "archived",
  "all",
];

const PRICE_OPTIONS = ["$", "$$", "$$$", "$$$$"] as const;

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "Curator picks" },
  { value: "rating", label: "Highest rated" },
  { value: "recently-visited", label: "Recently visited" },
  { value: "recently-added", label: "Recently added" },
  { value: "near-me", label: "Near me" },
];

const IMAGE_MODE_OPTIONS = [
  { value: "full", label: "Full" },
  { value: "compact", label: "Compact" },
  { value: "none", label: "None" },
] as const;

type Props = {
  cuisines: string[];
  activeCuisines: string[];
  onCuisineChange: (f: string[]) => void;
  cuisineCounts?: Record<string, number>;
  neighborhoods?: string[];
  activeNeighborhoods?: string[];
  onNeighborhoodChange?: (f: string[]) => void;
  neighborhoodCounts?: Record<string, number>;
  occasions?: string[];
  activeOccasions?: string[];
  onOccasionChange?: (f: string[]) => void;
  occasionCounts?: Record<string, number>;
  priceCounts?: Record<string, number>;
  onAdd?: () => void;
  viewMode?: "list" | "map";
  onViewModeChange?: (mode: "list" | "map") => void;
  mustTryFilter?: boolean;
  onMustTryFilterChange?: (v: boolean) => void;
  openNowFilter?: boolean;
  onOpenNowFilterChange?: (v: boolean) => void;
  wishlistFilter?: boolean;
  onWishlistFilterChange?: (v: boolean) => void;
  /** When false (default), the wishlist chip is hidden (e.g. signed-out users). */
  showWishlist?: boolean;
  activePrices?: string[];
  onPriceChange?: (prices: string[]) => void;
  isAdminView?: boolean;
  activeVisibility?: VisibilityFilter;
  onVisibilityChange?: (v: VisibilityFilter) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  imageDisplayMode?: ImageDisplayMode;
  onImageDisplayModeChange?: (mode: ImageDisplayMode) => void;
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
  resultCount?: number;
};

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export default function FilterBar({
  cuisines,
  activeCuisines,
  onCuisineChange,
  cuisineCounts,
  neighborhoods,
  activeNeighborhoods,
  onNeighborhoodChange,
  neighborhoodCounts,
  occasions,
  activeOccasions,
  onOccasionChange,
  occasionCounts,
  priceCounts,
  onAdd,
  viewMode,
  onViewModeChange,
  mustTryFilter,
  onMustTryFilterChange,
  openNowFilter,
  onOpenNowFilterChange,
  wishlistFilter,
  onWishlistFilterChange,
  showWishlist,
  activePrices,
  onPriceChange,
  isAdminView,
  activeVisibility,
  onVisibilityChange,
  searchQuery,
  onSearchChange,
  imageDisplayMode,
  onImageDisplayModeChange,
  sortMode,
  onSortModeChange,
  resultCount,
}: Props) {
  const [activePanel, setActivePanel] = useState<
    "cuisine" | "area" | "occasion" | "price" | "sort" | null
  >(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<"filters" | "sort">("filters");
  // Stays true through the close animation so the exit can play before unmount
  const [sheetMounted, setSheetMounted] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close desktop panel on clicks outside the filter bar
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

  // Sync mobile sheet state with URL hash so back/forward navigation preserves it
  useEffect(() => {
    if (typeof window === "undefined") return;
    function syncFromHash() {
      const h = window.location.hash;
      if (h === "#filters") {
        setSheetView("filters");
        setSheetOpen(true);
      } else if (h === "#sort") {
        setSheetView("sort");
        setSheetOpen(true);
      } else {
        setSheetOpen(false);
      }
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Scroll-lock body + ESC-to-close while sheet is open
  useEffect(() => {
    if (!sheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  // Delay unmount until the close animation finishes; cancel if reopened
  useEffect(() => {
    if (sheetOpen) {
      setSheetMounted(true);
      return;
    }
    const t = window.setTimeout(() => setSheetMounted(false), 280);
    return () => window.clearTimeout(t);
  }, [sheetOpen]);

  function openSheet(view: "filters" | "sort" = "filters") {
    setSheetView(view);
    setSheetOpen(true);
    if (typeof window !== "undefined") {
      const target = `#${view}`;
      if (window.location.hash !== target) {
        window.history.pushState(null, "", target);
      }
    }
  }

  function closeSheet() {
    setSheetOpen(false);
    if (typeof window !== "undefined") {
      const h = window.location.hash;
      if (h === "#filters" || h === "#sort") {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }
  }

  const hasCuisineFilter = activeCuisines.length > 0;
  const hasAreaFilter = (activeNeighborhoods ?? []).length > 0;
  const hasOccasionFilter = (activeOccasions ?? []).length > 0;
  const hasPriceFilter = (activePrices ?? []).length > 0;
  const panelOpen = activePanel !== null;
  const hasAnyFilter =
    hasCuisineFilter ||
    hasAreaFilter ||
    hasOccasionFilter ||
    hasPriceFilter ||
    mustTryFilter ||
    openNowFilter ||
    (showWishlist && wishlistFilter);
  const filterCount =
    activeCuisines.length +
    (activeNeighborhoods?.length ?? 0) +
    (activeOccasions?.length ?? 0) +
    (activePrices?.length ?? 0) +
    (mustTryFilter ? 1 : 0) +
    (openNowFilter ? 1 : 0) +
    (showWishlist && wishlistFilter ? 1 : 0);

  function handleClearAll() {
    onCuisineChange([]);
    if (onNeighborhoodChange) onNeighborhoodChange([]);
    if (onOccasionChange) onOccasionChange([]);
    if (onPriceChange) onPriceChange([]);
    if (onMustTryFilterChange) onMustTryFilterChange(false);
    if (onOpenNowFilterChange) onOpenNowFilterChange(false);
    if (onWishlistFilterChange) onWishlistFilterChange(false);
  }

  function removeFilter(
    type: "cuisine" | "area" | "occasion" | "price",
    value: string,
  ) {
    if (type === "cuisine") {
      onCuisineChange(activeCuisines.filter((c) => c !== value));
    } else if (type === "area" && onNeighborhoodChange) {
      onNeighborhoodChange(
        (activeNeighborhoods ?? []).filter((n) => n !== value),
      );
    } else if (type === "occasion" && onOccasionChange) {
      onOccasionChange((activeOccasions ?? []).filter((o) => o !== value));
    } else if (type === "price" && onPriceChange) {
      onPriceChange((activePrices ?? []).filter((p) => p !== value));
    }
  }

  // ── Render helpers (shared between desktop inline layout and mobile sheet) ──
  function renderViewToggle() {
    if (!onViewModeChange) return null;
    return (
      <>
        <span className="text-2xs font-medium text-txt2 uppercase tracking-wide">
          View:
        </span>
        <div className="flex gap-1">
          <button
            className={viewMode === "list" ? "chip-active" : "chip"}
            onClick={() => onViewModeChange("list")}
            title="Switch to list view"
          >
            List ☰
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
    );
  }

  function renderImageMode() {
    if (viewMode !== "list" || !onImageDisplayModeChange) return null;
    return (
      <>
        <span className="text-2xs font-medium text-txt2 uppercase tracking-wide">
          Images:
        </span>
        <div
          role="radiogroup"
          aria-label="Image display mode"
          className="inline-flex items-center rounded-pill border-[1.5px] border-brd bg-bg overflow-hidden"
        >
          {IMAGE_MODE_OPTIONS.map((opt, i) => {
            const active = (imageDisplayMode || "full") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onImageDisplayModeChange(opt.value)}
                title={`${opt.label} images`}
                className={`text-xs font-medium py-1.5 px-3 transition-colors duration-[0.12s] focus:outline-none ${
                  active
                    ? "bg-txt text-bg"
                    : "text-txt2 hover:text-txt hover:bg-bg2"
                } ${i > 0 ? "border-l-[1.5px] border-brd" : ""}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderMustTry() {
    if (!onMustTryFilterChange) return null;
    return (
      <button
        className={
          mustTryFilter ? "chip !border-accent !bg-accent !text-white" : "chip"
        }
        onClick={() => onMustTryFilterChange(!mustTryFilter)}
      >
        ★ Must-Try
      </button>
    );
  }

  function renderOpenNow() {
    if (!onOpenNowFilterChange) return null;
    return (
      <button
        className={openNowFilter ? "chip-active" : "chip"}
        onClick={() => onOpenNowFilterChange(!openNowFilter)}
        title="Only spots currently open"
      >
        🟢 Open Now
      </button>
    );
  }

  function renderWishlist() {
    if (!showWishlist || !onWishlistFilterChange) return null;
    return (
      <button
        className={
          wishlistFilter ? "chip !border-accent !bg-accent !text-white" : "chip"
        }
        onClick={() => onWishlistFilterChange(!wishlistFilter)}
        title="Only spots on your wishlist"
        aria-pressed={!!wishlistFilter}
      >
        ♥ Wishlist
      </button>
    );
  }

  function renderSortPill() {
    if (!onSortModeChange) return null;
    const current = sortMode ?? "default";
    const label =
      SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Sort";
    return (
      <button
        className={`chip flex items-center gap-1.5 ${activePanel === "sort" ? "!border-txt !bg-txt !text-bg" : ""}`}
        onClick={() => setActivePanel(activePanel === "sort" ? null : "sort")}
        title="Change sort order"
      >
        <span className="text-2xs font-medium uppercase tracking-wide opacity-70">
          Sort:
        </span>
        {label}
        <span
          className={`text-2xs transition-transform duration-[0.12s] ${activePanel === "sort" ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
    );
  }

  function renderSortList() {
    if (!onSortModeChange) return null;
    const current = sortMode ?? "default";
    return (
      <div
        role="radiogroup"
        aria-label="Sort order"
        className="flex flex-col rounded-md border-[1.5px] border-brd overflow-hidden"
      >
        {SORT_OPTIONS.map((opt, i) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                onSortModeChange(opt.value);
                setActivePanel(null);
              }}
              className={`flex items-center justify-between w-full text-left px-4 py-3 text-sm transition-colors duration-[0.12s] ${
                i > 0 ? "border-t-[1.5px] border-brd" : ""
              } ${
                active
                  ? "bg-txt text-bg font-medium"
                  : "bg-bg text-txt hover:bg-bg2"
              }`}
            >
              <span>{opt.label}</span>
              {active && (
                <span aria-hidden className="text-base leading-none">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderVisibility() {
    if (!isAdminView || !onVisibilityChange) return null;
    return (
      <>
        <span className="text-2xs font-medium text-txt2 uppercase tracking-wide">
          Visibility:
        </span>
        <div className="flex gap-1 flex-wrap">
          {VISIBILITY_OPTIONS.map((v) => (
            <button
              key={v}
              className={activeVisibility === v ? "chip-active" : "chip"}
              onClick={() => onVisibilityChange(v)}
              title={
                v === "public"
                  ? "Shown to everyone"
                  : v === "private"
                    ? "Curator journal only — hidden from public"
                    : v === "archived"
                      ? "Kept for history — hidden from public"
                      : "All visibilities"
              }
            >
              {v === "public"
                ? "Public"
                : v === "private"
                  ? "🔒 Private"
                  : v === "archived"
                    ? "📦 Archived"
                    : "All"}
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderCuisineChips() {
    return (
      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          className={!hasCuisineFilter ? "chip-active" : "chip"}
          onClick={() => onCuisineChange([])}
        >
          All
        </button>
        {cuisines.map((c) => {
          const count = cuisineCounts?.[c] ?? 0;
          const empty = cuisineCounts && count === 0;
          return (
            <button
              key={c}
              disabled={empty}
              className={`${
                activeCuisines.includes(c) ? "chip-active" : "chip"
              } ${empty ? "opacity-40 cursor-not-allowed" : ""}`}
              onClick={() => onCuisineChange(toggleItem(activeCuisines, c))}
            >
              {c}
              {cuisineCounts && (
                <span className="ml-1 opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderAreaChips() {
    if (!neighborhoods || !onNeighborhoodChange) return null;
    return (
      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          className={!hasAreaFilter ? "chip-active" : "chip"}
          onClick={() => onNeighborhoodChange([])}
        >
          All
        </button>
        {neighborhoods.map((n) => {
          const count = neighborhoodCounts?.[n] ?? 0;
          const empty = neighborhoodCounts && count === 0;
          return (
            <button
              key={n}
              disabled={empty}
              className={`${
                (activeNeighborhoods ?? []).includes(n) ? "chip-active" : "chip"
              } ${empty ? "opacity-40 cursor-not-allowed" : ""}`}
              onClick={() =>
                onNeighborhoodChange(toggleItem(activeNeighborhoods ?? [], n))
              }
            >
              {n}
              {neighborhoodCounts && (
                <span className="ml-1 opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderPriceChips() {
    if (!onPriceChange) return null;
    return (
      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          className={!hasPriceFilter ? "chip-active" : "chip"}
          onClick={() => onPriceChange([])}
        >
          All
        </button>
        {PRICE_OPTIONS.map((p) => {
          const count = priceCounts?.[p] ?? 0;
          const empty = priceCounts && count === 0;
          return (
            <button
              key={p}
              disabled={empty}
              className={`${
                (activePrices ?? []).includes(p) ? "chip-active" : "chip"
              } ${empty ? "opacity-40 cursor-not-allowed" : ""}`}
              onClick={() => onPriceChange(toggleItem(activePrices ?? [], p))}
            >
              {p}
              {priceCounts && (
                <span className="ml-1 opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderOccasionChips() {
    if (!occasions || !onOccasionChange) return null;
    return (
      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          className={!hasOccasionFilter ? "chip-active" : "chip"}
          onClick={() => onOccasionChange([])}
        >
          All
        </button>
        {occasions.map((o) => {
          const count = occasionCounts?.[o] ?? 0;
          const empty = occasionCounts && count === 0;
          return (
            <button
              key={o}
              disabled={empty}
              className={`${
                (activeOccasions ?? []).includes(o) ? "chip-active" : "chip"
              } ${empty ? "opacity-40 cursor-not-allowed" : ""}`}
              onClick={() =>
                onOccasionChange(toggleItem(activeOccasions ?? [], o))
              }
            >
              {formatOccasion(o)}
              {occasionCounts && (
                <span className="ml-1 opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderActivePills() {
    return (
      <>
        {activeCuisines.map((cuisine) => (
          <button
            key={`pill-cuisine-${cuisine}`}
            onClick={() => removeFilter("cuisine", cuisine)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            {cuisine}
            <span className="text-xs">✕</span>
          </button>
        ))}
        {(activeNeighborhoods ?? []).map((area) => (
          <button
            key={`pill-area-${area}`}
            onClick={() => removeFilter("area", area)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            {area}
            <span className="text-xs">✕</span>
          </button>
        ))}
        {(activeOccasions ?? []).map((occasion) => (
          <button
            key={`pill-occasion-${occasion}`}
            onClick={() => removeFilter("occasion", occasion)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            {formatOccasion(occasion)}
            <span className="text-xs">✕</span>
          </button>
        ))}
        {(activePrices ?? []).map((price) => (
          <button
            key={`pill-price-${price}`}
            onClick={() => removeFilter("price", price)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            {price}
            <span className="text-xs">✕</span>
          </button>
        ))}
        {mustTryFilter && onMustTryFilterChange && (
          <button
            key="pill-must-try"
            onClick={() => onMustTryFilterChange(false)}
            className="chip !border-accent !bg-accent !text-white flex items-center gap-1.5"
          >
            ★ Must-Try
            <span className="text-xs">✕</span>
          </button>
        )}
        {openNowFilter && onOpenNowFilterChange && (
          <button
            key="pill-open-now"
            onClick={() => onOpenNowFilterChange(false)}
            className="chip !border-txt !bg-txt !text-bg flex items-center gap-1.5"
          >
            🟢 Open Now
            <span className="text-xs">✕</span>
          </button>
        )}
        {showWishlist && wishlistFilter && onWishlistFilterChange && (
          <button
            key="pill-wishlist"
            onClick={() => onWishlistFilterChange(false)}
            className="chip !border-accent !bg-accent !text-white flex items-center gap-1.5"
          >
            ♥ Wishlist
            <span className="text-xs">✕</span>
          </button>
        )}
      </>
    );
  }

  return (
    <div
      ref={barRef}
      className={`sticky top-0 z-10 bg-bg isolate transition-[border-color] duration-200 ${isScrolled ? "border-b-2 border-txt" : "border-b-2 border-transparent"}`}
    >
      {/* Row 1: Search + Add (all viewports) */}
      <div className="flex gap-2 pt-3 pb-2 px-6 items-center flex-wrap">
        {onSearchChange != null && (
          <input
            type="text"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search restaurants, dishes, areas..."
            className="input-base !py-2 !px-3.5 !rounded-none flex-1 min-w-0 !bg-bg2 !border-brd placeholder:text-txt2 placeholder:opacity-60"
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

      {/* Mobile: Filters + Sort buttons + Clear link */}
      <div className="md:hidden flex gap-2 pb-2 px-6 items-center">
        <button
          type="button"
          onClick={() => openSheet("filters")}
          aria-expanded={sheetOpen && sheetView === "filters"}
          aria-controls="filters-sheet"
          className={`chip flex items-center gap-1.5 ${
            filterCount > 0 ? "!border-txt !bg-txt !text-bg" : ""
          }`}
        >
          <span aria-hidden>⚙︎</span>
          Filters
          {filterCount > 0 && <span>({filterCount})</span>}
        </button>
        {onSortModeChange && (
          <button
            type="button"
            onClick={() => openSheet("sort")}
            aria-expanded={sheetOpen && sheetView === "sort"}
            aria-controls="filters-sheet"
            className="chip flex items-center gap-1.5"
          >
            <span className="text-2xs font-medium uppercase tracking-wide opacity-70">
              Sort:
            </span>
            {SORT_OPTIONS.find((o) => o.value === (sortMode ?? "default"))
              ?.label ?? "Sort"}
            <span className="text-2xs">▾</span>
          </button>
        )}
        {hasAnyFilter && (
          <button
            onClick={handleClearAll}
            className="text-2xs font-medium text-accent bg-transparent border-none cursor-pointer px-1 py-0.5 transition-opacity duration-150 hover:opacity-70"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile: horizontally scrollable row of active filter pills */}
      {hasAnyFilter && (
        <div className="md:hidden flex gap-1.5 px-6 pb-3 overflow-x-auto scrollbar-hide">
          {renderActivePills()}
        </div>
      )}

      {/* Desktop Row 2: View toggle + Image mode + Sort + Highlights */}
      <div className="hidden md:flex gap-2 pb-2 px-6 items-center justify-between flex-wrap">
        <div className="flex gap-2 items-center flex-wrap">
          {renderViewToggle()}
          {renderImageMode()}
          {renderSortPill()}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {renderWishlist()}
          {renderOpenNow()}
          {renderMustTry()}
        </div>
      </div>

      {/* Desktop Row 2.5: Visibility (admin only) */}
      {isAdminView && onVisibilityChange && (
        <div className="hidden md:flex gap-2 pb-2 px-6 items-center flex-wrap">
          {renderVisibility()}
        </div>
      )}

      {/* Desktop Row 3: Filters label + active pills + dropdown toggles */}
      <div className="hidden md:flex gap-2 pb-3 px-6 items-center flex-wrap">
        <span className="text-2xs font-medium text-txt2 uppercase tracking-wide">
          Filters:
        </span>
        {renderActivePills()}

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

        {occasions &&
          occasions.length > 0 &&
          onOccasionChange &&
          !hasOccasionFilter && (
            <button
              className={`chip flex items-center gap-1.5 ${activePanel === "occasion" ? "!border-txt !bg-txt !text-bg" : ""}`}
              onClick={() =>
                setActivePanel(activePanel === "occasion" ? null : "occasion")
              }
            >
              Occasion
              <span
                className={`text-2xs transition-transform duration-[0.12s] ${activePanel === "occasion" ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
          )}

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

        {hasAnyFilter && (
          <button
            onClick={handleClearAll}
            className="text-2xs font-medium text-accent bg-transparent border-none cursor-pointer px-1 py-0.5 transition-opacity duration-150 hover:opacity-70"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Desktop slide-down chip panel */}
      <div
        className="hidden md:grid transition-[grid-template-rows] duration-200 ease-in-out bg-bg"
        style={{ gridTemplateRows: panelOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="py-3 px-6 max-h-[60vh] overflow-y-auto border-b-2 border-brd">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-body text-xs font-medium text-txt2 uppercase tracking-wide">
                {activePanel === "cuisine"
                  ? "Cuisine"
                  : activePanel === "area"
                    ? "Area"
                    : activePanel === "occasion"
                      ? "Occasion"
                      : activePanel === "sort"
                        ? "Sort"
                        : "Price"}
              </span>
              <button
                onClick={() => setActivePanel(null)}
                className="btn-ghost !text-base text-txt2 hover:text-txt leading-none"
              >
                ✕
              </button>
            </div>

            {activePanel === "cuisine" && renderCuisineChips()}
            {activePanel === "area" && renderAreaChips()}
            {activePanel === "occasion" && renderOccasionChips()}
            {activePanel === "price" && renderPriceChips()}
            {activePanel === "sort" && renderSortList()}
          </div>
        </div>
      </div>

      {/* Desktop panel shadow */}
      {panelOpen && (
        <div
          className="hidden md:block absolute left-0 right-0 bottom-0 h-6 pointer-events-none translate-y-full transition-opacity duration-200"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)",
          }}
        />
      )}

      {/* Mobile bottom sheet */}
      {sheetMounted && (
        <div
          id="filters-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className="md:hidden fixed inset-0 z-[100]"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={closeSheet}
            className={`absolute inset-0 w-full h-full bg-black/55 cursor-pointer border-none p-0 ${
              sheetOpen
                ? "motion-safe:animate-backdrop-in"
                : "motion-safe:animate-backdrop-out opacity-0"
            }`}
          />
          <div
            className={`absolute left-0 right-0 bottom-0 bg-bg max-h-[85vh] flex flex-col rounded-t-[20px] overflow-hidden shadow-[0_-18px_40px_-8px_rgba(0,0,0,0.35)] will-change-transform ${
              sheetOpen
                ? "motion-safe:animate-sheet-in"
                : "motion-safe:animate-sheet-out motion-reduce:translate-y-full"
            }`}
          >
            <div className="flex items-center justify-center pt-2.5 pb-1">
              <span
                aria-hidden
                className="block w-10 h-[5px] rounded-full bg-txt2/30"
              />
            </div>
            <div className="flex items-center justify-between px-6 pt-1 pb-3 border-b-2 border-brd">
              <h2 className="font-display text-2xl tracking-tight leading-none">
                {sheetView === "sort" ? "Sort" : "Filters"}
              </h2>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close"
                className="btn-ghost !text-xl text-txt2 hover:text-txt leading-none"
              >
                ✕
              </button>
            </div>

            {sheetView === "sort" ? (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {renderSortList()}
                </div>
                <div className="flex gap-2 px-6 py-4 border-t-2 border-brd">
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="btn-primary flex-1"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {onViewModeChange && (
                <section className="flex gap-2 items-center flex-wrap">
                  {renderViewToggle()}
                </section>
              )}

              {viewMode === "list" && onImageDisplayModeChange && (
                <section className="flex gap-2 items-center flex-wrap">
                  {renderImageMode()}
                </section>
              )}

              {onSortModeChange && (
                <section>
                  <span className="text-2xs font-medium text-txt2 uppercase tracking-wide block mb-2">
                    Sort
                  </span>
                  {renderSortList()}
                </section>
              )}

              {(onMustTryFilterChange ||
                onOpenNowFilterChange ||
                (showWishlist && onWishlistFilterChange)) && (
                <section>
                  <span className="text-2xs font-medium text-txt2 uppercase tracking-wide block mb-2">
                    Highlights
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {renderMustTry()}
                    {renderOpenNow()}
                    {renderWishlist()}
                  </div>
                </section>
              )}

              {isAdminView && onVisibilityChange && (
                <section className="flex gap-2 items-center flex-wrap">
                  {renderVisibility()}
                </section>
              )}

              {cuisines.length > 0 && (
                <section>
                  <span className="text-2xs font-medium text-txt2 uppercase tracking-wide block mb-2">
                    Cuisine
                  </span>
                  {renderCuisineChips()}
                </section>
              )}

              {neighborhoods &&
                neighborhoods.length > 0 &&
                onNeighborhoodChange && (
                  <section>
                    <span className="text-2xs font-medium text-txt2 uppercase tracking-wide block mb-2">
                      Area
                    </span>
                    {renderAreaChips()}
                  </section>
                )}

              {occasions &&
                occasions.length > 0 &&
                onOccasionChange && (
                  <section>
                    <span className="text-2xs font-medium text-txt2 uppercase tracking-wide block mb-2">
                      Occasion
                    </span>
                    {renderOccasionChips()}
                  </section>
                )}

              {onPriceChange && (
                <section>
                  <span className="text-2xs font-medium text-txt2 uppercase tracking-wide block mb-2">
                    Price
                  </span>
                  {renderPriceChips()}
                </section>
              )}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t-2 border-brd">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={!hasAnyFilter}
                className="btn-outline flex-1"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={closeSheet}
                className="btn-primary flex-1"
              >
                {hasAnyFilter && resultCount != null
                  ? `Show results (${resultCount})`
                  : "Done"}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
