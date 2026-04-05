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
import FilterBar from "@/components/FilterBar";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import Link from "next/link";

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading, username, login } = useAuth();
  const [usernameInput, setUsernameInput] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
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

  async function checkPassword() {
    const success = await login(usernameInput, pwInput);
    if (success) {
      loadData();
    } else {
      setPwError(true);
    }
  }

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
            Sign in to manage restaurants.
          </p>
          <input
            type="text"
            placeholder="Username"
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value);
              setPwError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && checkPassword()}
            className={`w-full py-2.5 px-3.5 text-[15px] border-[1.5px] ${
              pwError ? "border-accent" : "border-brd"
            } bg-bg text-txt rounded-none outline-none font-body mb-2`}
          />
          <input
            type="password"
            placeholder="Password"
            value={pwInput}
            onChange={(e) => {
              setPwInput(e.target.value);
              setPwError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && checkPassword()}
            className={`w-full py-2.5 px-3.5 text-[15px] border-[1.5px] ${
              pwError ? "border-accent" : "border-brd"
            } bg-bg text-txt rounded-none outline-none font-body mb-2`}
          />
          {pwError && (
            <p className="text-accent text-[13px] mb-3">
              Invalid username or password
            </p>
          )}
          <button
            onClick={checkPassword}
            className="w-full p-2.5 bg-txt text-bg border-none text-sm font-medium cursor-pointer font-body rounded-none"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="pt-10 px-6 pb-6 border-b-2 border-txt">
        <p className="text-[11px] tracking-[0.15em] uppercase text-accent font-medium mb-1.5">
          Admin · San Diego
        </p>
        <h1 className="font-display text-[clamp(48px,10vw,80px)] leading-[0.88]">
          MANAGE
          <br />
          <span className="text-accent">SPOTS</span>
        </h1>
        <div className="flex gap-2.5 mt-4">
          <span className="text-xs font-medium px-3 py-1 rounded-pill border-[1.5px] border-txt">
            {restaurants.length} spots
          </span>
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
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={setMustTryFilter}
        isAdminView
      />

      {opError && (
        <p className="py-3 px-6 text-accent text-[13px]">{opError}</p>
      )}

      {loading ? (
        <p className="py-12 px-6 text-txt2">Loading...</p>
      ) : (
        <RestaurantGrid
          restaurants={filtered}
          grouped={
            activeCuisines.length === 0 &&
            activeNeighborhoods.length === 0 &&
            !mustTryFilter
          }
          onEdit={(r) => {
            setEditingRestaurant(r);
            setShowModal(true);
          }}
          onOrder={handleOrder}
          onMarkVisited={handleMarkVisited}
          visitingId={visitingId}
          visits={visits}
        />
      )}

      {/* Stats Section */}
      <section className="border-t-2 border-txt p-6">
        <button
          onClick={() => {
            setShowStats(!showStats);
            if (!showStats) loadStats();
          }}
          className="font-display text-[22px] bg-none border-none cursor-pointer text-txt p-0 tracking-[0.04em]"
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
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-1">
                      Total views
                    </p>
                    <p className="font-display text-4xl">{totalViews}</p>
                  </div>
                  <div className="p-4 pr-5 border-[1.5px] border-brd min-w-[140px]">
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-1">
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
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-1">
                      Cleanup last run
                    </p>
                    <p className="text-[13px] text-txt">
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
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-1">
                      🧋 Boba Analytics
                    </p>
                    <p className="font-display text-2xl text-accent">View</p>
                  </Link>
                </div>

                {/* Views per day bar chart */}
                {viewsByDay.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-2">
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
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-2">
                      Top referrers
                    </p>
                    {topReferrers.map((ref) => (
                      <div
                        key={ref.referrer}
                        className="flex justify-between py-1.5 border-b border-brd text-[13px]"
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
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-2">
                      Geographic distribution
                    </p>
                    {geoData.map((geo) => (
                      <div
                        key={geo.location}
                        className="flex justify-between py-1.5 border-b border-brd text-[13px]"
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
                    <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-txt2 mb-2">
                      Device type breakdown
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      {deviceData.map((device) => (
                        <div
                          key={device.device}
                          className="p-3 border-[1.5px] border-brd min-w-[100px]"
                        >
                          <p className="text-[11px] text-txt2 mb-1 capitalize">
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
        <span className="text-[11px] font-medium text-txt2 opacity-50 tracking-[0.05em] font-body">
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
