"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, type Restaurant } from "@/lib/supabase";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar from "@/components/FilterBar";
import MapView from "@/components/MapView";
import Link from "next/link";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="py-12 px-6 text-txt2">Loading...</p>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(
    searchParams.get("cuisine") || "all",
  );
  const [neighborhoodFilter, setNeighborhoodFilter] = useState(
    searchParams.get("neighborhood") || "all",
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

  const syncParams = useCallback(
    (cuisine: string, neighborhood: string, mustTry: boolean) => {
      const params = new URLSearchParams();
      if (cuisine !== "all") params.set("cuisine", cuisine);
      if (neighborhood !== "all") params.set("neighborhood", neighborhood);
      if (mustTry) params.set("must_try", "true");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router],
  );

  function handleCuisineChange(v: string) {
    setActiveFilter(v);
    syncParams(v, neighborhoodFilter, mustTryFilter);
  }
  function handleNeighborhoodChange(v: string) {
    setNeighborhoodFilter(v);
    syncParams(activeFilter, v, mustTryFilter);
  }
  function handleMustTryChange(v: boolean) {
    setMustTryFilter(v);
    syncParams(activeFilter, neighborhoodFilter, v);
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
  const filtered = restaurants.filter((r) => {
    if (activeFilter !== "all" && r.cuisine !== activeFilter) return false;
    if (neighborhoodFilter !== "all" && r.neighborhood !== neighborhoodFilter)
      return false;
    if (mustTryFilter && !r.must_try) return false;
    return true;
  });

  const totalCount = restaurants.length;
  const cuisineCount = cuisines.length;

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="pt-10 px-6 pb-6 border-b-2 border-txt">
        <p className="text-[11px] tracking-[0.15em] uppercase text-accent font-medium mb-1.5">
          Local Picks · San Diego
        </p>
        <h1 className="font-display text-[clamp(56px,12vw,96px)] leading-[0.88] tracking-[0.02em]">
          VISIT
          <br />
          <span className="text-accent">SD</span>
        </h1>
        <p className="text-sm text-txt2 mt-3">
          Our go-to spots for visitors &amp; friends
        </p>
        <div className="flex gap-2.5 mt-4">
          {[`${totalCount} spots`, `${cuisineCount} cuisines`].map((label) => (
            <span
              key={label}
              className="text-xs font-medium px-3 py-1 rounded-pill border-[1.5px] border-txt text-txt"
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      <FilterBar
        cuisines={cuisines}
        active={activeFilter}
        onChange={handleCuisineChange}
        neighborhoods={neighborhoods}
        activeNeighborhood={neighborhoodFilter}
        onNeighborhoodChange={handleNeighborhoodChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={handleMustTryChange}
      />

      {loading ? (
        <p className="py-12 px-6 text-txt2">Loading...</p>
      ) : viewMode === "map" ? (
        <MapView restaurants={filtered} />
      ) : (
        <RestaurantGrid
          restaurants={filtered}
          grouped={
            activeFilter === "all" &&
            neighborhoodFilter === "all" &&
            !mustTryFilter
          }
        />
      )}

      <footer className="p-6 flex justify-end items-center gap-4">
        <span className="text-[11px] font-medium text-txt2 opacity-50 tracking-[0.05em] font-body">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
        <Link
          href="/admin"
          className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 opacity-30 hover:opacity-60 transition-opacity duration-150 no-underline flex items-center gap-1"
        >
          Admin <span className="text-[8px]">→</span>
        </Link>
      </footer>
    </main>
  );
}
