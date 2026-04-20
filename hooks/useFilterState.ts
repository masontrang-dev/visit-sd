"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ImageDisplayMode,
  VisibilityFilter,
} from "@/components/FilterBar";
import { trackEvent } from "@/lib/analytics";

export type FilterState = {
  activeCuisines: string[];
  activeNeighborhoods: string[];
  mustTryFilter: boolean;
  activePrices: string[];
  activeVisibility: VisibilityFilter;
  searchQuery: string;
  debouncedSearch: string;
  viewMode: "list" | "map";
  imageDisplayMode: ImageDisplayMode;
  isFiltered: boolean;
  setActiveCuisines: (v: string[]) => void;
  setActiveNeighborhoods: (v: string[]) => void;
  setMustTryFilter: (v: boolean) => void;
  setActivePrices: (v: string[]) => void;
  setActiveVisibility: (v: VisibilityFilter) => void;
  setSearchQuery: (v: string) => void;
  setViewMode: (v: "list" | "map") => void;
  setImageDisplayMode: (v: ImageDisplayMode) => void;
  clearAll: () => void;
};

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
  const [mustTryFilter, setMustTryFilterState] = useState(
    searchParams.get("must_try") === "true",
  );
  const [activePrices, setActivePricesState] = useState<string[]>(() => {
    const param = searchParams.get("price");
    return param ? param.split(",") : [];
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

  const syncParams = useCallback(
    (
      cuisines: string[],
      neighborhoods: string[],
      mustTry: boolean,
      prices: string[],
    ) => {
      const params = new URLSearchParams();
      if (cuisines.length > 0) params.set("cuisine", cuisines.join(","));
      if (neighborhoods.length > 0)
        params.set("neighborhood", neighborhoods.join(","));
      if (mustTry) params.set("must_try", "true");
      if (prices.length > 0) params.set("price", prices.join(","));
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router],
  );

  const setActiveCuisines = useCallback(
    (v: string[]) => {
      setActiveCuisinesState(v);
      syncParams(v, activeNeighborhoods, mustTryFilter, activePrices);
    },
    [syncParams, activeNeighborhoods, mustTryFilter, activePrices],
  );

  const setActiveNeighborhoods = useCallback(
    (v: string[]) => {
      setActiveNeighborhoodsState(v);
      syncParams(activeCuisines, v, mustTryFilter, activePrices);
    },
    [syncParams, activeCuisines, mustTryFilter, activePrices],
  );

  const setMustTryFilter = useCallback(
    (v: boolean) => {
      setMustTryFilterState(v);
      syncParams(activeCuisines, activeNeighborhoods, v, activePrices);
    },
    [syncParams, activeCuisines, activeNeighborhoods, activePrices],
  );

  const setActivePrices = useCallback(
    (v: string[]) => {
      setActivePricesState(v);
      syncParams(activeCuisines, activeNeighborhoods, mustTryFilter, v);
    },
    [syncParams, activeCuisines, activeNeighborhoods, mustTryFilter],
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
    setMustTryFilterState(false);
    setActivePricesState([]);
    setSearchQuery("");
    syncParams([], [], false, []);
  }, [syncParams]);

  const isFiltered =
    activeCuisines.length > 0 ||
    activeNeighborhoods.length > 0 ||
    mustTryFilter ||
    activePrices.length > 0 ||
    debouncedSearch.trim() !== "";

  return {
    activeCuisines,
    activeNeighborhoods,
    mustTryFilter,
    activePrices,
    activeVisibility,
    searchQuery,
    debouncedSearch,
    viewMode,
    imageDisplayMode,
    isFiltered,
    setActiveCuisines,
    setActiveNeighborhoods,
    setMustTryFilter,
    setActivePrices,
    setActiveVisibility,
    setSearchQuery,
    setViewMode,
    setImageDisplayMode,
    clearAll,
  };
}
