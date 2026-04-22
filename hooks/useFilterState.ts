"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ImageDisplayMode,
  VisibilityFilter,
} from "@/components/FilterBar";
import { trackEvent } from "@/lib/analytics";

export type SortMode =
  | "default"
  | "rating"
  | "recently-visited"
  | "recently-added"
  | "near-me";

export type FilterState = {
  activeCuisines: string[];
  activeNeighborhoods: string[];
  activeOccasions: string[];
  activeFoodTags: string[];
  mustTryFilter: boolean;
  openNowFilter: boolean;
  wishlistFilter: boolean;
  activePrices: string[];
  activeVisibility: VisibilityFilter;
  searchQuery: string;
  debouncedSearch: string;
  viewMode: "list" | "map";
  imageDisplayMode: ImageDisplayMode;
  sortMode: SortMode;
  isFiltered: boolean;
  setActiveCuisines: (v: string[]) => void;
  setActiveNeighborhoods: (v: string[]) => void;
  setActiveOccasions: (v: string[]) => void;
  setActiveFoodTags: (v: string[]) => void;
  setMustTryFilter: (v: boolean) => void;
  setOpenNowFilter: (v: boolean) => void;
  setWishlistFilter: (v: boolean) => void;
  setActivePrices: (v: string[]) => void;
  setActiveVisibility: (v: VisibilityFilter) => void;
  setSearchQuery: (v: string) => void;
  setViewMode: (v: "list" | "map") => void;
  setImageDisplayMode: (v: ImageDisplayMode) => void;
  setSortMode: (v: SortMode) => void;
  clearAll: () => void;
};

const SORT_MODES: SortMode[] = [
  "default",
  "rating",
  "recently-visited",
  "recently-added",
  "near-me",
];

type UrlState = {
  cuisines: string[];
  neighborhoods: string[];
  occasions: string[];
  foodTags: string[];
  mustTry: boolean;
  openNow: boolean;
  wishlist: boolean;
  prices: string[];
  sort: SortMode;
};

function buildQs(s: UrlState): string {
  const params = new URLSearchParams();
  if (s.cuisines.length > 0) params.set("cuisine", s.cuisines.join(","));
  if (s.neighborhoods.length > 0)
    params.set("neighborhood", s.neighborhoods.join(","));
  if (s.occasions.length > 0) params.set("occasion", s.occasions.join(","));
  if (s.foodTags.length > 0) params.set("food_tag", s.foodTags.join(","));
  if (s.mustTry) params.set("must_try", "true");
  if (s.openNow) params.set("open_now", "true");
  if (s.wishlist) params.set("wishlist", "true");
  if (s.prices.length > 0) params.set("price", s.prices.join(","));
  if (s.sort !== "default") params.set("sort", s.sort);
  return params.toString();
}

export function useFilterState(): FilterState {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeCuisines, setActiveCuisinesState] = useState<string[]>(() => {
    const param = searchParams.get("cuisine");
    return param ? param.split(",") : [];
  });
  const [activeNeighborhoods, setActiveNeighborhoodsState] = useState<string[]>(
    () => {
      const param = searchParams.get("neighborhood");
      return param ? param.split(",") : [];
    },
  );
  const [activeOccasions, setActiveOccasionsState] = useState<string[]>(() => {
    const param = searchParams.get("occasion");
    return param ? param.split(",") : [];
  });
  const [activeFoodTags, setActiveFoodTagsState] = useState<string[]>(() => {
    const param = searchParams.get("food_tag");
    return param ? param.split(",") : [];
  });
  const [mustTryFilter, setMustTryFilterState] = useState(
    searchParams.get("must_try") === "true",
  );
  const [openNowFilter, setOpenNowFilterState] = useState(
    searchParams.get("open_now") === "true",
  );
  const [wishlistFilter, setWishlistFilterState] = useState(
    searchParams.get("wishlist") === "true",
  );
  const [activePrices, setActivePricesState] = useState<string[]>(() => {
    const param = searchParams.get("price");
    return param ? param.split(",") : [];
  });
  const [sortMode, setSortModeState] = useState<SortMode>(() => {
    const param = searchParams.get("sort");
    return SORT_MODES.includes(param as SortMode)
      ? (param as SortMode)
      : "default";
  });
  const [activeVisibility, setActiveVisibility] =
    useState<VisibilityFilter>("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [imageDisplayMode, setImageDisplayModeState] =
    useState<ImageDisplayMode>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("visitsd-image-display");
        if (saved === "full" || saved === "compact" || saved === "none") {
          return saved;
        }
      }
      return "full";
    });

  // Debounce search input for filtering.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Log search queries separately with a longer settle window so we only
  // capture queries the user actually paused on (not every keystroke).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(
      () => trackEvent("search", q.slice(0, 100)),
      1200,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Mirror current URL-backed filter state through a ref so setters can
  // recompute the query string without depending on every filter variable
  // (which would otherwise make every setter recompute on every change).
  const stateRef = useRef<UrlState>({
    cuisines: activeCuisines,
    neighborhoods: activeNeighborhoods,
    occasions: activeOccasions,
    foodTags: activeFoodTags,
    mustTry: mustTryFilter,
    openNow: openNowFilter,
    wishlist: wishlistFilter,
    prices: activePrices,
    sort: sortMode,
  });
  stateRef.current = {
    cuisines: activeCuisines,
    neighborhoods: activeNeighborhoods,
    occasions: activeOccasions,
    foodTags: activeFoodTags,
    mustTry: mustTryFilter,
    openNow: openNowFilter,
    wishlist: wishlistFilter,
    prices: activePrices,
    sort: sortMode,
  };

  const syncUrl = useCallback(
    (patch: Partial<UrlState>) => {
      const next = { ...stateRef.current, ...patch };
      const qs = buildQs(next);
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router],
  );

  const setActiveCuisines = useCallback(
    (v: string[]) => {
      setActiveCuisinesState(v);
      syncUrl({ cuisines: v });
    },
    [syncUrl],
  );

  const setActiveNeighborhoods = useCallback(
    (v: string[]) => {
      setActiveNeighborhoodsState(v);
      syncUrl({ neighborhoods: v });
    },
    [syncUrl],
  );

  const setActiveOccasions = useCallback(
    (v: string[]) => {
      setActiveOccasionsState(v);
      syncUrl({ occasions: v });
    },
    [syncUrl],
  );

  const setActiveFoodTags = useCallback(
    (v: string[]) => {
      setActiveFoodTagsState(v);
      syncUrl({ foodTags: v });
    },
    [syncUrl],
  );

  const setMustTryFilter = useCallback(
    (v: boolean) => {
      setMustTryFilterState(v);
      syncUrl({ mustTry: v });
    },
    [syncUrl],
  );

  const setOpenNowFilter = useCallback(
    (v: boolean) => {
      setOpenNowFilterState(v);
      syncUrl({ openNow: v });
    },
    [syncUrl],
  );

  const setWishlistFilter = useCallback(
    (v: boolean) => {
      setWishlistFilterState(v);
      syncUrl({ wishlist: v });
    },
    [syncUrl],
  );

  const setActivePrices = useCallback(
    (v: string[]) => {
      setActivePricesState(v);
      syncUrl({ prices: v });
    },
    [syncUrl],
  );

  const setSortMode = useCallback(
    (v: SortMode) => {
      setSortModeState(v);
      syncUrl({ sort: v });
    },
    [syncUrl],
  );

  const setImageDisplayMode = useCallback((mode: ImageDisplayMode) => {
    setImageDisplayModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("visitsd-image-display", mode);
    }
  }, []);

  const clearAll = useCallback(() => {
    setActiveCuisinesState([]);
    setActiveNeighborhoodsState([]);
    setActiveOccasionsState([]);
    setActiveFoodTagsState([]);
    setMustTryFilterState(false);
    setOpenNowFilterState(false);
    setWishlistFilterState(false);
    setActivePricesState([]);
    setSortModeState("default");
    setSearchQuery("");
    syncUrl({
      cuisines: [],
      neighborhoods: [],
      occasions: [],
      foodTags: [],
      mustTry: false,
      openNow: false,
      wishlist: false,
      prices: [],
      sort: "default",
    });
  }, [syncUrl]);

  const isFiltered =
    activeCuisines.length > 0 ||
    activeNeighborhoods.length > 0 ||
    activeOccasions.length > 0 ||
    activeFoodTags.length > 0 ||
    mustTryFilter ||
    openNowFilter ||
    wishlistFilter ||
    activePrices.length > 0 ||
    debouncedSearch.trim() !== "";

  return {
    activeCuisines,
    activeNeighborhoods,
    activeOccasions,
    activeFoodTags,
    mustTryFilter,
    openNowFilter,
    wishlistFilter,
    activePrices,
    activeVisibility,
    searchQuery,
    debouncedSearch,
    viewMode,
    imageDisplayMode,
    sortMode,
    isFiltered,
    setActiveCuisines,
    setActiveNeighborhoods,
    setActiveOccasions,
    setActiveFoodTags,
    setMustTryFilter,
    setOpenNowFilter,
    setWishlistFilter,
    setActivePrices,
    setActiveVisibility,
    setSearchQuery,
    setViewMode,
    setImageDisplayMode,
    setSortMode,
    clearAll,
  };
}
