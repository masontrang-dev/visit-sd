"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  type Restaurant,
  type PageView,
  type RestaurantVisit,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar, { type ImageDisplayMode } from "@/components/FilterBar";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import MapView from "@/components/MapView";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";
import AdminViewToggle from "@/components/AdminViewToggle";

export default function AdminPage() {
  const {
    isAdmin,
    isSuperuser,
    isLoading: authLoading,
    user,
    signInWithGoogle,
    signInWithGithub,
    signInWithApple,
  } = useAuth();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  async function handleMarkVisited(restaurantId: number, visitedBy: string) {
    setVisitingId(restaurantId);
    setOpError("");

    const now = new Date().toISOString();

    const { error: visitError } = await supabase
      .from("restaurant_visits")
      .insert([{ restaurant_id: restaurantId, visited_by: visitedBy }]);

    if (visitError) {
      setOpError("Failed to log visit.");
      setVisitingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ last_visited: now })
      .eq("id", restaurantId);

    if (updateError) {
      setOpError("Failed to update last visited timestamp.");
    }

    setVisitingId(null);
    loadData();
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
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-[360px]">
          <p className="font-display text-5xl mb-2">ADMIN</p>
          <p className="text-txt2 text-sm mb-6">
            Sign in with your account to manage restaurants.
          </p>
          {user && !isAdmin && (
            <div className="mb-4 p-4 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">
                Your account does not have admin access. Please contact the site
                administrator.
              </p>
            </div>
          )}
          <button
            onClick={signInWithGoogle}
            className="btn-secondary w-full mb-3 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
          <button
            onClick={signInWithGithub}
            className="btn-secondary w-full mb-3 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Sign in with GitHub
          </button>
          <button
            onClick={signInWithApple}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Sign in with Apple
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="relative pt-10 px-6 pb-6 border-b-2 border-txt">
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <AdminButton />
            <ThemeToggle />
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
          <span className="text-xs font-medium px-3 py-1 rounded-pill border-[1.5px] border-txt">
            {restaurants.length} spots
          </span>
          {isSuperuser && (
            <Link
              href="/admin/users"
              className="text-xs font-medium px-3 py-1 rounded-pill border-[1.5px] border-accent text-accent hover:bg-accent hover:text-white transition-colors"
            >
              Manage Users
            </Link>
          )}
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
          grouped={
            activeCuisines.length === 0 &&
            activeNeighborhoods.length === 0 &&
            !mustTryFilter &&
            activePrices.length === 0 &&
            debouncedSearch.trim() === ""
          }
          onEdit={(r) => {
            setEditingRestaurant(r);
            setShowModal(true);
          }}
          onOrder={handleOrder}
          onMarkVisited={handleMarkVisited}
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
