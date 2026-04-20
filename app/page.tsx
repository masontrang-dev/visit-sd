"use client";

import { Suspense, useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Restaurant } from "@/lib/supabase";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar from "@/components/FilterBar";
import MapView from "@/components/MapView";
import ContextHeader from "@/components/ContextHeader";
import SurpriseBar from "@/components/SurpriseBar";
import CheckInModal from "@/components/CheckInModal";
import AddModal from "@/components/AddModal";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ActivityFeed from "@/components/ActivityFeed";
import AdminButton from "@/components/AdminButton";
import { useAuth } from "@/lib/auth-context";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useHomeData } from "@/hooks/useHomeData";
import { useFilterState } from "@/hooks/useFilterState";
import { success } from "@/lib/haptics";

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

function StatPill({
  value,
  label,
  duration = 800,
  countFromZero = false,
}: {
  value: number;
  label: string;
  duration?: number;
  countFromZero?: boolean;
}) {
  const [display, setDisplay] = useState(countFromZero ? 0 : value);
  const prevRef = useRef(countFromZero ? 0 : value);
  const initialRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, duration, countFromZero]);

  return <>{`${display} ${label}`}</>;
}

function HomeContent() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const {
    restaurants,
    recommendedItems,
    restaurantPhotos,
    visits,
    loading,
    reload,
  } = useHomeData(isAdmin, user);
  const {
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
  } = useFilterState();

  const [checkInRestaurant, setCheckInRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [visitingId, setVisitingId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapEverMounted, setMapEverMounted] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addOpError, setAddOpError] = useState("");
  const surpriseBtnRef = useRef<HTMLButtonElement>(null);

  function handleCheckInClick(restaurant: Restaurant) {
    setCheckInRestaurant(restaurant);
  }

  async function handleCheckIn(visitDate: string, shouldLogOrder: boolean) {
    if (!checkInRestaurant || !user) return;

    const visitedBy = user.user_metadata?.name || user.email || "Unknown";

    setVisitingId(checkInRestaurant.id);
    setCheckInRestaurant(null);

    const { error: visitError } = await supabase
      .from("restaurant_visits")
      .insert([
        {
          restaurant_id: checkInRestaurant.id,
          visited_by: visitedBy,
          visited_at: visitDate,
        },
      ]);

    if (visitError) {
      console.error("Failed to log visit:", visitError);
      setVisitingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ last_visited: visitDate })
      .eq("id", checkInRestaurant.id);

    if (updateError) {
      console.error("Failed to update last visited:", updateError);
    }

    setVisitingId(null);
    await reload();
  }

  async function handleAddRestaurant(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    setAddOpError("");
    const { error } = await supabase.from("restaurants").insert([entry]);
    if (error) {
      console.error("Insert error:", error);
      setAddOpError("Failed to add restaurant.");
      return false;
    }
    await reload();
    return true;
  }

  useEffect(() => {
    if (viewMode === "map") setMapEverMounted(true);
  }, [viewMode]);

  useEffect(() => {
    setMounted(true);

    const visited = localStorage.getItem("visitsd-visited");
    if (!visited) {
      setIsFirstVisit(true);
      localStorage.setItem("visitsd-visited", "1");
    }

    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && viewMode === "map") {
        setViewMode("list");
      }
    };
    window.addEventListener("resize", handleResize);

    // DOM-only scroll fade for the Surprise-me button (no re-render).
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (surpriseBtnRef.current) {
        surpriseBtnRef.current.style.opacity = "0.3";
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (surpriseBtnRef.current) {
          surpriseBtnRef.current.style.opacity = "1";
        }
      }, 150);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [viewMode, setViewMode]);

  const { pullDistance, refreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await reload();
      success();
    },
  });

  const visibilityScoped = useMemo(
    () =>
      restaurants.filter((r) => {
        if (isAdmin && activeVisibility !== "all") {
          if ((r.visibility ?? "public") !== activeVisibility) return false;
        }
        return true;
      }),
    [restaurants, isAdmin, activeVisibility],
  );

  const cuisines = Array.from(
    new Set(visibilityScoped.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const neighborhoods = Array.from(
    new Set(visibilityScoped.map((r) => r.neighborhood).filter(Boolean)),
  ).sort();
  const cuisineCounts = useMemo(() => {
    const m: Record<string, number> = {};
    visibilityScoped.forEach((r) => {
      if (r.cuisine) m[r.cuisine] = (m[r.cuisine] ?? 0) + 1;
    });
    return m;
  }, [visibilityScoped]);
  const neighborhoodCounts = useMemo(() => {
    const m: Record<string, number> = {};
    visibilityScoped.forEach((r) => {
      if (r.neighborhood) m[r.neighborhood] = (m[r.neighborhood] ?? 0) + 1;
    });
    return m;
  }, [visibilityScoped]);
  const priceCounts = useMemo(() => {
    const m: Record<string, number> = {};
    visibilityScoped.forEach((r) => {
      if (r.price) m[r.price] = (m[r.price] ?? 0) + 1;
    });
    return m;
  }, [visibilityScoped]);
  const filtered = useMemo(
    () =>
      restaurants.filter((r) => {
        if (isAdmin && activeVisibility !== "all") {
          if ((r.visibility ?? "public") !== activeVisibility) return false;
        }
        if (
          activeCuisines.length > 0 &&
          !activeCuisines.includes(r.cuisine || "")
        )
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
      }),
    [
      restaurants,
      isAdmin,
      activeVisibility,
      activeCuisines,
      activeNeighborhoods,
      mustTryFilter,
      activePrices,
      debouncedSearch,
    ],
  );

  const totalCount = restaurants.length;
  // Pills at the top describe the full dataset, not the current filter view,
  // so they stay steady when the admin toggles between visibility filters.
  const cuisineCount = useMemo(
    () =>
      new Set(restaurants.map((r) => r.cuisine).filter(Boolean)).size,
    [restaurants],
  );
  const neighborhoodCount = useMemo(
    () =>
      new Set(restaurants.map((r) => r.neighborhood).filter(Boolean)).size,
    [restaurants],
  );

  return (
    <main className="min-h-screen">
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center pointer-events-none"
          style={{
            height: refreshing ? threshold : pullDistance,
            opacity: refreshing ? 1 : Math.min(pullDistance / threshold, 1),
          }}
          aria-hidden="true"
        >
          <div
            className={`w-6 h-6 border-[2px] border-accent border-t-transparent rounded-full ${
              refreshing ? "animate-spin" : "motion-safe:transition-transform"
            }`}
            style={
              refreshing
                ? undefined
                : {
                    transform: `rotate(${Math.min((pullDistance / threshold) * 360, 360)}deg)`,
                  }
            }
          />
        </div>
      )}
      {/* Hero or Context Header */}
      {!isFiltered ? (
        <header
          className={`relative pt-6 md:pt-10 px-6 pb-4 md:pb-6 border-b-2 border-txt transition-opacity duration-500 overflow-hidden ${mounted ? "grain opacity-100" : "opacity-0"}`}
        >
          <div
            className={`absolute top-4 right-4 flex flex-col items-end gap-2 ${mounted ? "z-10" : ""}`}
          >
            <div className="flex gap-2">
              <ThemeToggle />
              <ActivityFeed />
              <AdminButton />
            </div>
          </div>
          <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
            Local Picks · San Diego
          </p>
          <h1 className="font-display text-[clamp(48px,12vw,96px)] leading-[0.88] tracking-tight scroll-parallax">
            {isFirstVisit ? (
              <span className="word-reveal">
                <span style={{ animationDelay: "200ms" }}>VISIT</span>
                <br />
                <span
                  className="text-accent"
                  style={{ animationDelay: "500ms" }}
                >
                  SD
                </span>
              </span>
            ) : (
              <>
                VISIT
                <br />
                <span className="text-accent">SD</span>
              </>
            )}
          </h1>
          <p className="text-base text-txt2 mt-2 md:mt-3 max-w-[280px]">
            Our go-to spots for visitors &amp; friends
          </p>
          <div className="flex gap-2.5 mt-3 md:mt-4">
            {(
              [
                [totalCount, "spots"],
                [cuisineCount, "cuisines"],
                [neighborhoodCount, "areas"],
              ] as const
            ).map(([count, label], i) => (
              <span
                key={label}
                className={`text-xs font-medium px-3 py-1 rounded-pill border-[1.5px] border-txt text-txt ${mounted ? "animate-fade-up" : "opacity-0"}`}
                style={
                  mounted ? { animationDelay: `${300 + i * 100}ms` } : undefined
                }
              >
                <StatPill
                  value={count}
                  label={label}
                  countFromZero={isFirstVisit}
                />
              </span>
            ))}
          </div>
        </header>
      ) : (
        <div className="relative">
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
            <div className="flex gap-2">
              <ThemeToggle />
              <ActivityFeed />
              <AdminButton />
            </div>
          </div>
          <ContextHeader
            activeCuisines={activeCuisines}
            activeNeighborhoods={activeNeighborhoods}
            searchQuery={debouncedSearch}
            matchCount={filtered.length}
            totalCount={totalCount}
          />
        </div>
      )}

      <FilterBar
        cuisines={cuisines}
        activeCuisines={activeCuisines}
        onCuisineChange={setActiveCuisines}
        cuisineCounts={cuisineCounts}
        neighborhoods={neighborhoods}
        activeNeighborhoods={activeNeighborhoods}
        onNeighborhoodChange={setActiveNeighborhoods}
        neighborhoodCounts={neighborhoodCounts}
        priceCounts={priceCounts}
        onAdd={isAdmin ? () => setShowAddModal(true) : undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={setMustTryFilter}
        activePrices={activePrices}
        onPriceChange={setActivePrices}
        isAdminView={isAdmin}
        activeVisibility={activeVisibility}
        onVisibilityChange={setActiveVisibility}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        imageDisplayMode={imageDisplayMode}
        onImageDisplayModeChange={setImageDisplayMode}
      />

      {addOpError && (
        <p className="py-3 px-6 text-error text-sm">{addOpError}</p>
      )}

      <div className="relative z-0">
        {loading ? (
          <SkeletonGrid />
        ) : (
          <div className="relative">
            <div
              className={`transition-opacity duration-200 ${
                viewMode === "list"
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none absolute inset-x-0 top-0"
              }`}
              aria-hidden={viewMode !== "list"}
            >
              <RestaurantGrid
                restaurants={filtered}
                grouped={false}
                baseDelay={isFirstVisit ? 400 : 0}
                recommendedItems={recommendedItems}
                restaurantPhotos={restaurantPhotos}
                imageDisplayMode={imageDisplayMode}
                onCheckIn={handleCheckInClick}
                visitingId={visitingId}
                visits={user ? visits : undefined}
              />
              {isFiltered && <SurpriseBar restaurants={filtered} />}
            </div>
            {mapEverMounted && (
              <div
                className={`transition-opacity duration-200 ${
                  viewMode === "map"
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none absolute inset-x-0 top-0"
                }`}
                aria-hidden={viewMode !== "map"}
              >
                <MapView restaurants={filtered} allRestaurants={restaurants} />
              </div>
            )}
            {!isFiltered && viewMode === "list" && (
              <button
                ref={surpriseBtnRef}
                onClick={() => {
                  const pool = filtered.filter(
                    (r) => (r.visibility ?? "public") === "public",
                  );
                  if (pool.length === 0) return;
                  const randomIndex = Math.floor(Math.random() * pool.length);
                  const randomRestaurant = pool[randomIndex];
                  router.push(`/restaurant/${randomRestaurant.id}`);
                }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium px-3 py-1.5 rounded-pill bg-txt text-bg border-[1.5px] border-txt shadow-lg z-20 transition-opacity duration-200 hover:opacity-90 active:scale-95"
              >
                Surprise me ✦
              </button>
            )}
          </div>
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
        </footer>
      </div>

      {/* Check-In Modal */}
      {checkInRestaurant && (
        <CheckInModal
          restaurantName={checkInRestaurant.name}
          onConfirm={handleCheckIn}
          onClose={() => setCheckInRestaurant(null)}
        />
      )}

      {/* Add Restaurant Modal (admin only) */}
      {showAddModal && isAdmin && (
        <AddModal
          onSave={handleAddRestaurant}
          onClose={() => setShowAddModal(false)}
          existingCuisines={cuisines}
        />
      )}
    </main>
  );
}
