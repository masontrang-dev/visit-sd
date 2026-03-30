"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, type Restaurant } from "@/lib/supabase";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar from "@/components/FilterBar";
import MapView from "@/components/MapView";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <p style={{ padding: "3rem 1.5rem", color: "var(--txt2)" }}>
          Loading...
        </p>
      }
    >
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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
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

    // Fire-and-forget page view log
    supabase
      .from("page_views")
      .insert([
        {
          path: window.location.pathname + window.location.search,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        },
      ])
      .then(() => {});
  }, []);

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
    <main style={{ minHeight: "100vh" }}>
      {/* Hero */}
      <header
        style={{
          padding: "2.5rem 1.5rem 1.5rem",
          borderBottom: "2px solid var(--txt)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Local Picks · San Diego
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(56px,12vw,96px)",
            lineHeight: 0.88,
            letterSpacing: "0.02em",
          }}
        >
          VISIT
          <br />
          <span style={{ color: "var(--accent)" }}>SD</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--txt2)", marginTop: 12 }}>
          Our go-to spots for visitors &amp; friends
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[`${totalCount} spots`, `${cuisineCount} cuisines`].map((label) => (
            <span
              key={label}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: 20,
                border: "1.5px solid var(--txt)",
                color: "var(--txt)",
              }}
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
        showAdmin
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={handleMustTryChange}
        showCopyLink
      />

      {loading ? (
        <p style={{ padding: "3rem 1.5rem", color: "var(--txt2)" }}>
          Loading...
        </p>
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

      <footer
        style={{
          padding: "1.5rem",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--txt2)",
            opacity: 0.5,
            letterSpacing: "0.05em",
            fontFamily: "var(--font-body)",
          }}
        >
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
      </footer>
    </main>
  );
}
