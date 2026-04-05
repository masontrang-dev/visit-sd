"use client";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, type Restaurant } from "@/lib/supabase";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar from "@/components/FilterBar";
import MapView from "@/components/MapView";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import AdminButton from "@/components/AdminButton";

function SkeletonCard() {
  return (
    <div className="bg-bg border-b border-brd">
      <div className="w-full aspect-[3/2] bg-bg2 animate-pulse" />
      <div className="p-5">
        <div className="h-3 w-16 bg-bg2 rounded-pill animate-pulse mb-2" />
        <div className="h-7 w-3/4 bg-bg2 animate-pulse mb-2" />
        <div className="h-4 w-1/3 bg-bg2 animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 bg-brd border-l border-brd">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<SkeletonGrid />}>
      <HomeContent />
    </Suspense>
  );
}

function StatPill({ value, label, duration = 800, countFromZero = false }: { value: number; label: string; duration?: number; countFromZero?: boolean }) {
  const [display, setDisplay] = useState(countFromZero ? 0 : value);
  const prevRef = useRef(countFromZero ? 0 : value);
  const initialRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      if (countFromZero && value > 0) {
        timerRef.current = setTimeout(() => {
          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));
            if (progress < 1) requestAnimationFrame(tick);
            else prevRef.current = value;
          }
          requestAnimationFrame(tick);
        }, 600);
        return;
      }
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    if (value === prevRef.current) return;

    const start = performance.now();
    const from = prevRef.current;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (value - from) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = value;
    }
    requestAnimationFrame(tick);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, duration, countFromZero]);

  return <>{`${display} ${label}`}</>;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCuisines, setActiveCuisines] = useState<string[]>(() => {
    const param = searchParams.get("cuisine");
    return param ? param.split(",") : [];
  });
  const [activeNeighborhoods, setActiveNeighborhoods] = useState<string[]>(
    () => {
      const param = searchParams.get("neighborhood");
      return param ? param.split(",") : [];
    },
  );
  const [viewMode, setViewMode] = useState<"list" | "map">(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      return isMobile ? "list" : "list";
    }
    return "list";
  });
  const [mustTryFilter, setMustTryFilter] = useState(
    searchParams.get("must_try") === "true",
  );
  const [activePrices, setActivePrices] = useState<string[]>(() => {
    const param = searchParams.get("price");
    return param ? param.split(",") : [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const syncParams = useCallback(
    (cuisines: string[], neighborhoods: string[], mustTry: boolean, prices: string[]) => {
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

  function handleCuisineChange(v: string[]) {
    setActiveCuisines(v);
    syncParams(v, activeNeighborhoods, mustTryFilter, activePrices);
  }
  function handleNeighborhoodChange(v: string[]) {
    setActiveNeighborhoods(v);
    syncParams(activeCuisines, v, mustTryFilter, activePrices);
  }
  function handleMustTryChange(v: boolean) {
    setMustTryFilter(v);
    syncParams(activeCuisines, activeNeighborhoods, v, activePrices);
  }
  function handlePriceChange(v: string[]) {
    setActivePrices(v);
    syncParams(activeCuisines, activeNeighborhoods, mustTryFilter, v);
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .order("cuisine")
        .order("name");
      setRestaurants(data ?? []);
      setLoading(false);
    }
    load();
    setMounted(true);

    const visited = localStorage.getItem("visitsd-visited");
    if (!visited) {
      setIsFirstVisit(true);
      localStorage.setItem("visitsd-visited", "1");
    }

    // Fire-and-forget page view log with geolocation
    fetch("/api/log-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      }),
    }).catch(() => {});

    // Optimize for mobile on initial load
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && viewMode === "map") {
        setViewMode("list");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const neighborhoods = Array.from(
    new Set(restaurants.map((r) => r.neighborhood).filter(Boolean)),
  ).sort();
  const filtered = useMemo(() => restaurants.filter((r) => {
    if (activeCuisines.length > 0 && !activeCuisines.includes(r.cuisine || ""))
      return false;
    if (
      activeNeighborhoods.length > 0 &&
      !activeNeighborhoods.includes(r.neighborhood || "")
    )
      return false;
    if (mustTryFilter && !r.must_try) return false;
    if (activePrices.length > 0 && !activePrices.includes(r.price || ""))
      return false;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      const searchable = [r.name, r.cuisine, r.neighborhood, r.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  }), [restaurants, activeCuisines, activeNeighborhoods, mustTryFilter, activePrices, debouncedSearch]);

  const totalCount = restaurants.length;
  const cuisineCount = cuisines.length;
  const isFiltered =
    activeCuisines.length > 0 ||
    activeNeighborhoods.length > 0 ||
    mustTryFilter ||
    activePrices.length > 0 ||
    debouncedSearch.trim() !== "";

  function handleClearAll() {
    setActiveCuisines([]);
    setActiveNeighborhoods([]);
    setMustTryFilter(false);
    setActivePrices([]);
    setSearchQuery("");
    syncParams([], [], false, []);
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header
        className={`relative pt-10 px-6 pb-6 border-b-2 border-txt transition-opacity duration-500 overflow-hidden ${mounted ? "grain opacity-100" : "opacity-0"}`}
      >
        <div className={`absolute top-4 right-4 flex gap-2 ${mounted ? "z-10" : ""}`}>
          <AdminButton />
          <ThemeToggle />
        </div>
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
          Local Picks · San Diego
        </p>
        <h1 className="font-display text-[clamp(56px,12vw,96px)] leading-[0.88] tracking-tight scroll-parallax">
          {isFirstVisit ? (
            <span className="word-reveal">
              <span style={{ animationDelay: "200ms" }}>VISIT</span>
              <br />
              <span className="text-accent" style={{ animationDelay: "500ms" }}>SD</span>
            </span>
          ) : (
            <>VISIT<br /><span className="text-accent">SD</span></>
          )}
        </h1>
        <p className="text-base text-txt2 mt-3 max-w-[280px]">
          Our go-to spots for visitors &amp; friends
        </p>
        <div className="flex gap-2.5 mt-4">
          {(
            [
              [totalCount, "spots"],
              [cuisineCount, "cuisines"],
              [neighborhoods.length, "areas"],
            ] as const
          ).map(([count, label], i) => (
            <span
              key={label}
              className={`text-xs font-medium px-3 py-1 rounded-pill border-[1.5px] border-txt text-txt ${mounted ? "animate-fade-up" : "opacity-0"}`}
              style={mounted ? { animationDelay: `${300 + i * 100}ms` } : undefined}
            >
              <StatPill value={count} label={label} countFromZero={isFirstVisit} />
            </span>
          ))}
        </div>
      </header>

      <FilterBar
        cuisines={cuisines}
        activeCuisines={activeCuisines}
        onCuisineChange={handleCuisineChange}
        neighborhoods={neighborhoods}
        activeNeighborhoods={activeNeighborhoods}
        onNeighborhoodChange={handleNeighborhoodChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={handleMustTryChange}
        activePrices={activePrices}
        onPriceChange={handlePriceChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="relative z-0">
        {isFiltered && !loading && (
          <div className="flex items-center justify-between py-2.5 px-6 border-b-2 border-txt">
            <p className="text-sm text-txt2 font-body">
              {searchQuery !== debouncedSearch ? (
                <span className="text-txt2 opacity-60">Searching...</span>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium text-txt">{filtered.length}</span> of{" "}
                  <span className="font-medium text-txt">{restaurants.length}</span>{" "}
                  spots
                </>
              )}
            </p>
            <button
              onClick={handleClearAll}
              className="font-body text-xs font-medium text-accent bg-transparent border-none cursor-pointer p-0 transition-opacity duration-[0.12s] hover:opacity-70"
            >
              Clear filters
            </button>
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : viewMode === "map" ? (
          <div className="animate-fade-up">
            <MapView restaurants={filtered} allRestaurants={restaurants} />
          </div>
        ) : (
          <RestaurantGrid restaurants={filtered} grouped={false} baseDelay={isFirstVisit ? 400 : 0} />
        )}

        <footer className="p-6 flex justify-end items-center gap-4">
          <span className="text-xs font-medium text-txt2 opacity-50 tracking-tight font-body">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
          <Link
            href="/privacy"
            className="text-2xs tracking-wide uppercase font-medium text-txt2 opacity-30 hover:opacity-60 transition-opacity duration-150 no-underline"
          >
            Privacy
          </Link>
          <Link
            href="/admin"
            className="text-2xs tracking-wide uppercase font-medium text-txt2 opacity-30 hover:opacity-60 transition-opacity duration-150 no-underline flex items-center gap-1"
          >
            Admin <span className="text-[8px]">→</span>
          </Link>
        </footer>
      </div>
    </main>
  );
}
