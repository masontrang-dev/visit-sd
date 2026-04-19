"use client";

import {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, type Restaurant, type MenuItem } from "@/lib/supabase";
import RestaurantGrid, {
  type RestaurantPhoto,
} from "@/components/RestaurantGrid";
import FilterBar, {
  type ImageDisplayMode,
  type VisibilityFilter,
} from "@/components/FilterBar";
import MapView from "@/components/MapView";
import ContextHeader from "@/components/ContextHeader";
import SurpriseBar from "@/components/SurpriseBar";
import CheckInModal from "@/components/CheckInModal";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ActivityFeed from "@/components/ActivityFeed";
import AdminButton from "@/components/AdminButton";
import AdminViewToggle from "@/components/AdminViewToggle";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";

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

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, duration, countFromZero]);

  return <>{`${display} ${label}`}</>;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInRestaurant, setCheckInRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [visitingId, setVisitingId] = useState<number | null>(null);
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
  const [imageDisplayMode, setImageDisplayMode] = useState<ImageDisplayMode>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("visitsd-image-display");
        if (saved === "full" || saved === "compact" || saved === "none") {
          return saved;
        }
      }
      return "full";
    },
  );
  const [mustTryFilter, setMustTryFilter] = useState(
    searchParams.get("must_try") === "true",
  );
  const [activePrices, setActivePrices] = useState<string[]>(() => {
    const param = searchParams.get("price");
    return param ? param.split(",") : [];
  });
  const [activeVisibility, setActiveVisibility] =
    useState<VisibilityFilter>("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [recommendedItems, setRecommendedItems] = useState<
    Record<number, MenuItem[]>
  >({});
  const [restaurantPhotos, setRestaurantPhotos] = useState<
    Record<number, RestaurantPhoto[]>
  >({});
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

    // Optionally reload data to show updated visit info
    // For now, we'll just clear the visiting state
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Log search queries separately with a longer settle window so we only
  // capture queries the user actually paused on (not every keystroke).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => trackEvent("search", q.slice(0, 100)), 1200);
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
  function handleImageDisplayModeChange(mode: ImageDisplayMode) {
    setImageDisplayMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("visitsd-image-display", mode);
    }
  }

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("restaurants")
        .select("*")
        .order("cuisine")
        .order("name");
      if (!isAdmin) {
        query = query.eq("visibility", "public");
      }
      const { data } = (await query) as { data: Restaurant[] | null };
      setRestaurants(data ?? []);

      // Fetch recommended menu items, scoped to restaurants the viewer can see
      if (data && data.length > 0) {
        const visibleRestaurantIds = data.map((r) => r.id);
        const { data: recRows } = (await supabase
          .from("menu_item_recommendations")
          .select("menu_item_id")) as {
          data: { menu_item_id: number }[] | null;
        };

        const recommendedIds = Array.from(
          new Set((recRows ?? []).map((r) => r.menu_item_id)),
        );
        const recommendedSet = new Set(recommendedIds);

        if (recommendedIds.length > 0) {
          const { data: menuData } = (await supabase
            .from("menu_items")
            .select("*")
            .in("id", recommendedIds)
            .in("restaurant_id", visibleRestaurantIds)
            .order("name")) as { data: MenuItem[] | null };

          if (menuData) {
            const itemsByRestaurant: Record<number, MenuItem[]> = {};
            menuData.forEach((item) => {
              if (!itemsByRestaurant[item.restaurant_id]) {
                itemsByRestaurant[item.restaurant_id] = [];
              }
              itemsByRestaurant[item.restaurant_id].push(item);
            });
            setRecommendedItems(itemsByRestaurant);
          }
        }

        // Fetch order photos for the carousel: recommended items first, then others
        const { data: orderRows } = (await supabase
          .from("item_orders")
          .select("restaurant_id, menu_item_id, photo_url, ordered_at")
          .in("restaurant_id", visibleRestaurantIds)
          .not("photo_url", "is", null)
          .order("ordered_at", { ascending: false })) as {
          data:
            | {
                restaurant_id: number;
                menu_item_id: number;
                photo_url: string;
                ordered_at: string;
              }[]
            | null;
        };

        if (orderRows && orderRows.length > 0) {
          const orderMenuIds = Array.from(
            new Set(orderRows.map((o) => o.menu_item_id)),
          );
          const { data: namedItems } = (await supabase
            .from("menu_items")
            .select("id, name")
            .in("id", orderMenuIds)) as {
            data: { id: number; name: string }[] | null;
          };
          const nameById = new Map<number, string>();
          (namedItems ?? []).forEach((m) => nameById.set(m.id, m.name));

          const PHOTOS_PER_RESTAURANT = 8;
          const buckets: Record<number, RestaurantPhoto[]> = {};
          const seen: Record<number, Set<string>> = {};
          orderRows.forEach((o) => {
            const photo: RestaurantPhoto = {
              url: o.photo_url,
              itemName: nameById.get(o.menu_item_id) ?? null,
              isStorefront: false,
              isRecommended: recommendedSet.has(o.menu_item_id),
            };
            if (!buckets[o.restaurant_id]) {
              buckets[o.restaurant_id] = [];
              seen[o.restaurant_id] = new Set();
            }
            if (seen[o.restaurant_id].has(photo.url)) return;
            seen[o.restaurant_id].add(photo.url);
            buckets[o.restaurant_id].push(photo);
          });

          // Sort each bucket: recommended first, then chronological order preserved
          Object.keys(buckets).forEach((key) => {
            const id = Number(key);
            buckets[id].sort(
              (a, b) => Number(b.isRecommended) - Number(a.isRecommended),
            );
            buckets[id] = buckets[id].slice(0, PHOTOS_PER_RESTAURANT);
          });
          setRestaurantPhotos(buckets);
        }
      }

      setLoading(false);
    }
    load();
    setMounted(true);

    const visited = localStorage.getItem("visitsd-visited");
    if (!visited) {
      setIsFirstVisit(true);
      localStorage.setItem("visitsd-visited", "1");
    }

    // Optimize for mobile on initial load
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && viewMode === "map") {
        setViewMode("list");
      }
    };
    window.addEventListener("resize", handleResize);

    // Handle scroll detection for fade effect on surprise button (via DOM, no re-render)
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
  }, [viewMode, isAdmin]);

  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const neighborhoods = Array.from(
    new Set(restaurants.map((r) => r.neighborhood).filter(Boolean)),
  ).sort();
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
            <AdminViewToggle />
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
                [neighborhoods.length, "areas"],
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
            <AdminViewToggle />
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
        isAdminView={isAdmin}
        activeVisibility={activeVisibility}
        onVisibilityChange={setActiveVisibility}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        imageDisplayMode={imageDisplayMode}
        onImageDisplayModeChange={handleImageDisplayModeChange}
      />

      <div className="relative z-0">
        {loading ? (
          <SkeletonGrid />
        ) : viewMode === "map" ? (
          <div className="animate-fade-up">
            <MapView restaurants={filtered} allRestaurants={restaurants} />
          </div>
        ) : (
          <>
            <RestaurantGrid
              restaurants={filtered}
              grouped={false}
              baseDelay={isFirstVisit ? 400 : 0}
              recommendedItems={recommendedItems}
              restaurantPhotos={restaurantPhotos}
              imageDisplayMode={imageDisplayMode}
              onCheckIn={handleCheckInClick}
              visitingId={visitingId}
            />
            {!loading && isFiltered && <SurpriseBar restaurants={filtered} />}
            {!loading && !isFiltered && (
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
          </>
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
    </main>
  );
}
