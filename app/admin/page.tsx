"use client";

import { useEffect, useState, useRef } from "react";
import {
  supabase,
  type Restaurant,
  type PageView,
  type RestaurantVisit,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar, {
  type ImageDisplayMode,
  type VisibilityFilter,
} from "@/components/FilterBar";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import MapView from "@/components/MapView";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";
import AdminViewToggle from "@/components/AdminViewToggle";

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

export default function AdminPage() {
  const { isAdmin, isSuperuser, isLoading: authLoading, user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCuisines, setActiveCuisines] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [orderingRestaurant, setOrderingRestaurant] =
    useState<Restaurant | null>(null);
  const [opError, setOpError] = useState("");
  const [mustTryFilter, setMustTryFilter] = useState(false);
  const [activeNeighborhoods, setActiveNeighborhoods] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [totalViews, setTotalViews] = useState(0);
  const [viewsByDay, setViewsByDay] = useState<
    { date: string; count: number }[]
  >([]);
  const [topReferrers, setTopReferrers] = useState<
    { referrer: string; count: number }[]
  >([]);
  const [geoData, setGeoData] = useState<{ location: string; count: number }[]>(
    [],
  );
  const [deviceData, setDeviceData] = useState<
    { device: string; count: number }[]
  >([]);
  const [lastCleanup, setLastCleanup] = useState<string | null>(null);
  const [visits, setVisits] = useState<Record<number, RestaurantVisit[]>>({});
  const [visitingId, setVisitingId] = useState<number | null>(null);
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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [activePrices, setActivePrices] = useState<string[]>([]);
  const [activeVisibility, setActiveVisibility] =
    useState<VisibilityFilter>("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadStats() {
    setStatsLoading(true);
    const { data, error } = await supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setTotalViews(data.length);

      // Views per day (last 30 days)
      const dayCounts: Record<string, number> = {};
      data.forEach((row: PageView) => {
        const day = row.created_at.slice(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const sorted = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
      setViewsByDay(sorted);

      // Top referrers
      const refCounts: Record<string, number> = {};
      data.forEach((row: PageView) => {
        const ref = row.referrer || "(direct)";
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      });
      const topRefs = Object.entries(refCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopReferrers(topRefs);

      // Geographic distribution
      const geoCounts: Record<string, number> = {};
      data.forEach((row: PageView) => {
        if (row.city && row.region && row.country) {
          const location = `${row.city}, ${row.region}, ${row.country}`;
          geoCounts[location] = (geoCounts[location] || 0) + 1;
        } else if (row.city && row.country) {
          const location = `${row.city}, ${row.country}`;
          geoCounts[location] = (geoCounts[location] || 0) + 1;
        } else if (row.country) {
          geoCounts[row.country] = (geoCounts[row.country] || 0) + 1;
        }
      });
      const topGeo = Object.entries(geoCounts)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setGeoData(topGeo);

      // Device type breakdown
      const deviceCounts: Record<string, number> = {};
      data.forEach((row: PageView) => {
        const device = row.device_type || "unknown";
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const devices = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);
      setDeviceData(devices);

      // Fetch last cleanup run time from cleanup_log
      const { data: cronData } = await supabase.rpc("get_last_cleanup_run");
      if (cronData && cronData.length > 0) {
        setLastCleanup(cronData[0].executed_at);
      }
    }
    setStatsLoading(false);
  }

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadData();
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authLoading]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("cuisine")
      .order("name");
    setRestaurants(data ?? []);
    await loadVisits();
    setLoading(false);
  }

  async function loadVisits() {
    const { data } = await supabase
      .from("restaurant_visits")
      .select("*")
      .order("visited_at", { ascending: false });
    if (data) {
      const grouped: Record<number, RestaurantVisit[]> = {};
      data.forEach((visit: RestaurantVisit) => {
        if (!grouped[visit.restaurant_id]) grouped[visit.restaurant_id] = [];
        grouped[visit.restaurant_id].push(visit);
      });
      setVisits(grouped);
    }
  }

  async function handleAdd(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    setOpError("");
    console.log("INSERT payload:", JSON.stringify(entry, null, 2));
    console.log("Photo URL being saved:", entry.photo_url);
    const { error, data } = await supabase
      .from("restaurants")
      .insert([entry])
      .select();
    console.log("INSERT response:", { error, data });
    if (error) {
      console.error("Insert error:", error);
      setOpError("Failed to add restaurant.");
      return false;
    }
    loadData();
    return true;
  }

  async function handleEdit(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    if (!editingRestaurant) return false;
    setOpError("");
    console.log("UPDATE payload:", JSON.stringify(entry, null, 2));
    console.log("Photo URL being updated:", entry.photo_url);
    const { error } = await supabase
      .from("restaurants")
      .update(entry)
      .eq("id", editingRestaurant.id);
    if (error) {
      console.error("Update error:", error);
      setOpError("Failed to update restaurant.");
      return false;
    }
    loadData();
    return true;
  }

  function handleOrder(restaurant: Restaurant) {
    setOrderingRestaurant(restaurant);
    setShowOrderModal(true);
  }

  function handleImageDisplayModeChange(mode: ImageDisplayMode) {
    setImageDisplayMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("visitsd-image-display", mode);
    }
  }

  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const neighborhoods = Array.from(
    new Set(restaurants.map((r) => r.neighborhood).filter(Boolean)),
  ).sort();
  const filtered = restaurants.filter((r) => {
    if (activeVisibility !== "all") {
      if ((r.visibility ?? "public") !== activeVisibility) return false;
    }
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
  });

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Loading...</p>
      </main>
    );
  }

  if (!isAdmin) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Redirecting...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="relative pt-10 px-6 pb-6 border-b-2 border-txt">
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <ThemeToggle />
            <AdminButton />
          </div>
          <AdminViewToggle />
        </div>
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
          Admin · San Diego
        </p>
        <h1 className="font-display text-[clamp(48px,10vw,80px)] leading-[0.88]">
          MANAGE
          <br />
          <span className="text-accent">SPOTS</span>
        </h1>
        <div className="flex gap-2.5 mt-4 items-center">
          {(
            [
              [restaurants.length, "spots"],
              [cuisines.length, "cuisines"],
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
              <StatPill value={count} label={label} countFromZero={true} />
            </span>
          ))}
        </div>
      </header>

      <FilterBar
        cuisines={cuisines}
        activeCuisines={activeCuisines}
        onCuisineChange={setActiveCuisines}
        neighborhoods={neighborhoods}
        activeNeighborhoods={activeNeighborhoods}
        onNeighborhoodChange={setActiveNeighborhoods}
        onAdd={() => {
          setEditingRestaurant(null);
          setShowModal(true);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={setMustTryFilter}
        activePrices={activePrices}
        onPriceChange={setActivePrices}
        isAdminView
        activeVisibility={activeVisibility}
        onVisibilityChange={setActiveVisibility}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        imageDisplayMode={imageDisplayMode}
        onImageDisplayModeChange={handleImageDisplayModeChange}
      />

      {opError && <p className="py-3 px-6 text-error text-sm">{opError}</p>}

      {loading ? (
        <p className="py-12 px-6 text-txt2">Loading...</p>
      ) : viewMode === "map" ? (
        <MapView restaurants={filtered} allRestaurants={restaurants} />
      ) : (
        <RestaurantGrid
          restaurants={filtered}
          grouped={false}
          onEdit={(r) => {
            setEditingRestaurant(r);
            setShowModal(true);
          }}
          onOrder={handleOrder}
          visitingId={visitingId}
          visits={visits}
          imageDisplayMode={imageDisplayMode}
        />
      )}

      {/* Stats Section */}
      <section className="border-t-2 border-txt p-6">
        <button
          onClick={() => {
            setShowStats(!showStats);
            if (!showStats) loadStats();
          }}
          className="font-display text-xl bg-none border-none cursor-pointer text-txt p-0 tracking-tight"
        >
          {showStats ? "▾ STATS" : "▸ STATS"}
        </button>

        {showStats && (
          <div className="mt-4">
            {statsLoading ? (
              <p className="text-txt2 text-sm">Loading stats...</p>
            ) : (
              <>
                <div className="flex gap-4 mb-6 flex-wrap">
                  <div className="p-4 pr-5 border-[1.5px] border-brd min-w-[140px]">
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-1">
                      Total views
                    </p>
                    <p className="font-display text-4xl">{totalViews}</p>
                  </div>
                  <div className="p-4 pr-5 border-[1.5px] border-brd min-w-[140px]">
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-1">
                      Today
                    </p>
                    <p className="font-display text-4xl">
                      {viewsByDay.length > 0
                        ? viewsByDay[viewsByDay.length - 1].date ===
                          new Date().toISOString().slice(0, 10)
                          ? viewsByDay[viewsByDay.length - 1].count
                          : 0
                        : 0}
                    </p>
                  </div>
                  <div className="p-4 pr-5 border-[1.5px] border-brd min-w-[200px]">
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-1">
                      Cleanup last run
                    </p>
                    <p className="text-sm text-txt">
                      {lastCleanup
                        ? new Date(lastCleanup).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Not yet run"}
                    </p>
                  </div>
                  <Link
                    href="/admin/boba"
                    className="p-4 pr-5 border-[1.5px] border-brd min-w-[140px] no-underline block hover:bg-bg2 transition-colors duration-[0.12s]"
                  >
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-1">
                      🧋 Boba Analytics
                    </p>
                    <p className="font-display text-2xl text-accent">View</p>
                  </Link>
                </div>

                {/* Views per day bar chart */}
                {viewsByDay.length > 0 && (
                  <div className="mb-6">
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                      Views per day (last 30 days)
                    </p>
                    <div className="flex items-end gap-0.5 h-20 border-b border-brd pb-1">
                      {viewsByDay.map((d) => {
                        const max = Math.max(...viewsByDay.map((v) => v.count));
                        const h = max > 0 ? (d.count / max) * 70 : 0;
                        return (
                          <div
                            key={d.date}
                            title={`${d.date}: ${d.count}`}
                            className="flex-1 bg-accent rounded-t-sm min-w-[4px]"
                            style={{ height: Math.max(h, 2) }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top referrers */}
                {topReferrers.length > 0 && (
                  <div className="mb-6">
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                      Top referrers
                    </p>
                    {topReferrers.map((ref) => (
                      <div
                        key={ref.referrer}
                        className="flex justify-between py-1.5 border-b border-brd text-sm"
                      >
                        <span className="text-txt2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[80%]">
                          {ref.referrer}
                        </span>
                        <span className="font-medium">{ref.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Geographic distribution */}
                {geoData.length > 0 && (
                  <div className="mb-6">
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                      Geographic distribution
                    </p>
                    {geoData.map((geo) => (
                      <div
                        key={geo.location}
                        className="flex justify-between py-1.5 border-b border-brd text-sm"
                      >
                        <span className="text-txt2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[80%]">
                          {geo.location}
                        </span>
                        <span className="font-medium">{geo.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Device breakdown */}
                {deviceData.length > 0 && (
                  <div className="mb-6">
                    <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                      Device type breakdown
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      {deviceData.map((device) => (
                        <div
                          key={device.device}
                          className="p-3 border-[1.5px] border-brd min-w-[100px]"
                        >
                          <p className="text-xs text-txt2 mb-1 capitalize">
                            {device.device}
                          </p>
                          <p className="font-display text-2xl">
                            {device.count}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-txt2 mt-4">
                  Analytics data older than 90 days is automatically deleted
                  daily.
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <footer className="p-6 flex justify-end">
        <span className="text-xs font-medium text-txt2 opacity-50 tracking-tight font-body">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
      </footer>

      {showModal && (
        <AddModal
          onSave={editingRestaurant ? handleEdit : handleAdd}
          onClose={() => {
            setShowModal(false);
            setEditingRestaurant(null);
          }}
          editData={editingRestaurant}
          existingCuisines={cuisines}
        />
      )}

      {/* Order Modal */}
      {showOrderModal && orderingRestaurant && (
        <OrderModal
          restaurantId={orderingRestaurant.id}
          onClose={() => {
            setShowOrderModal(false);
            setOrderingRestaurant(null);
          }}
          onSaved={() => {
            setShowOrderModal(false);
            setOrderingRestaurant(null);
          }}
        />
      )}
    </main>
  );
}
