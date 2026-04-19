"use client";

import { useEffect, useState } from "react";
import { supabase, type PageView } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";

export default function StatsPage() {
  const { isSuperuser, isLoading: authLoading } = useAuth();
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [uniqueSessions, setUniqueSessions] = useState(0);
  const [viewsByDay, setViewsByDay] = useState<
    { date: string; count: number }[]
  >([]);
  const [topPages, setTopPages] = useState<{ path: string; count: number }[]>(
    [],
  );
  const [topReferrers, setTopReferrers] = useState<
    { referrer: string; count: number }[]
  >([]);
  const [geoData, setGeoData] = useState<{ location: string; count: number }[]>(
    [],
  );
  const [deviceData, setDeviceData] = useState<
    { device: string; count: number }[]
  >([]);
  const [topSearches, setTopSearches] = useState<
    { query: string; count: number }[]
  >([]);
  const [outboundByType, setOutboundByType] = useState<
    { label: string; count: number }[]
  >([]);
  const [outboundByRestaurant, setOutboundByRestaurant] = useState<
    { path: string; count: number }[]
  >([]);
  const [lastCleanup, setLastCleanup] = useState<string | null>(null);

  function restaurantLabel(path: string): string {
    const match = path.match(/^\/restaurant\/(\d+)/);
    return match ? `/restaurant/${match[1]}` : path;
  }

  useEffect(() => {
    if (!authLoading && isSuperuser) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperuser, authLoading]);

  async function loadStats() {
    setStatsLoading(true);
    const { data, error } = await supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const pageViews = (data as PageView[]).filter((r) => !r.event_type);
      const events = (data as PageView[]).filter((r) => r.event_type);

      setTotalViews(pageViews.length);

      const sessions = new Set(
        pageViews.map((r) => r.session_id).filter((id): id is string => !!id),
      );
      setUniqueSessions(sessions.size);

      const dayCounts: Record<string, number> = {};
      pageViews.forEach((row) => {
        const day = row.created_at.slice(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const sorted = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
      setViewsByDay(sorted);

      const pathCounts: Record<string, number> = {};
      pageViews.forEach((row) => {
        const label = restaurantLabel(row.path || "(unknown)");
        pathCounts[label] = (pathCounts[label] || 0) + 1;
      });
      const topPaths = Object.entries(pathCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopPages(topPaths);

      const refCounts: Record<string, number> = {};
      pageViews.forEach((row) => {
        const ref = row.referrer || "(direct)";
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      });
      const topRefs = Object.entries(refCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopReferrers(topRefs);

      const geoCounts: Record<string, number> = {};
      pageViews.forEach((row) => {
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

      const deviceCounts: Record<string, number> = {};
      pageViews.forEach((row) => {
        const device = row.device_type || "unknown";
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const devices = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);
      setDeviceData(devices);

      const searchCounts: Record<string, number> = {};
      events
        .filter((e) => e.event_type === "search" && e.event_label)
        .forEach((e) => {
          const q = (e.event_label as string).trim().toLowerCase();
          if (!q) return;
          searchCounts[q] = (searchCounts[q] || 0) + 1;
        });
      const topQueries = Object.entries(searchCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopSearches(topQueries);

      const outboundEvents = events.filter(
        (e) => e.event_type === "outbound_click",
      );
      const outboundTypeCounts: Record<string, number> = {};
      const outboundPathCounts: Record<string, number> = {};
      outboundEvents.forEach((e) => {
        const label = e.event_label || "unknown";
        outboundTypeCounts[label] = (outboundTypeCounts[label] || 0) + 1;
        const path = restaurantLabel(e.path || "(unknown)");
        outboundPathCounts[path] = (outboundPathCounts[path] || 0) + 1;
      });
      setOutboundByType(
        Object.entries(outboundTypeCounts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      );
      setOutboundByRestaurant(
        Object.entries(outboundPathCounts)
          .map(([path, count]) => ({ path, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      );

      const { data: cronData } = await supabase.rpc("get_last_cleanup_run");
      if (cronData && cronData.length > 0) {
        setLastCleanup(cronData[0].executed_at);
      }
    }
    setStatsLoading(false);
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Loading...</p>
      </main>
    );
  }

  if (!isSuperuser) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-error text-lg mb-4">Access Denied</p>
          <p className="text-txt2 text-sm mb-6">
            Only superusers can access site stats.
          </p>
          <Link href="/admin" className="text-accent hover:underline">
            Back to Admin
          </Link>
        </div>
      </main>
    );
  }

  const todayCount =
    viewsByDay.length > 0 &&
    viewsByDay[viewsByDay.length - 1].date ===
      new Date().toISOString().slice(0, 10)
      ? viewsByDay[viewsByDay.length - 1].count
      : 0;

  return (
    <main className="min-h-screen">
      <header className="relative pt-10 px-6 pb-6 border-b-2 border-txt">
        <div className="absolute top-4 right-4 flex gap-2">
          <ThemeToggle />
          <AdminButton />
        </div>
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
          Admin · Analytics
        </p>
        <h1 className="font-display text-5xl mb-2">STATS</h1>
        <p className="text-txt2 text-sm">Site traffic and usage analytics</p>
        <div className="mt-4">
          <Link href="/admin" className="text-sm text-accent hover:underline">
            ← Back to Admin
          </Link>
        </div>
      </header>

      <section className="p-6">
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
                  Unique sessions
                </p>
                <p className="font-display text-4xl">{uniqueSessions}</p>
              </div>
              <div className="p-4 pr-5 border-[1.5px] border-brd min-w-[140px]">
                <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-1">
                  Today
                </p>
                <p className="font-display text-4xl">{todayCount}</p>
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
            </div>

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

            {topPages.length > 0 && (
              <div className="mb-6">
                <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                  Top pages
                </p>
                {topPages.map((p) => (
                  <div
                    key={p.path}
                    className="flex justify-between py-1.5 border-b border-brd text-sm"
                  >
                    <span className="text-txt2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[80%]">
                      {p.path}
                    </span>
                    <span className="font-medium">{p.count}</span>
                  </div>
                ))}
              </div>
            )}

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

            {topSearches.length > 0 && (
              <div className="mb-6">
                <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                  Top searches
                </p>
                {topSearches.map((s) => (
                  <div
                    key={s.query}
                    className="flex justify-between py-1.5 border-b border-brd text-sm"
                  >
                    <span className="text-txt2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[80%]">
                      {s.query}
                    </span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            )}

            {outboundByType.length > 0 && (
              <div className="mb-6">
                <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                  Outbound clicks
                </p>
                <div className="flex gap-4 flex-wrap">
                  {outboundByType.map((o) => (
                    <div
                      key={o.label}
                      className="p-3 border-[1.5px] border-brd min-w-[120px]"
                    >
                      <p className="text-xs text-txt2 mb-1 capitalize">
                        {o.label.replace(/_/g, " ")}
                      </p>
                      <p className="font-display text-2xl">{o.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outboundByRestaurant.length > 0 && (
              <div className="mb-6">
                <p className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-2">
                  Top clicked restaurants
                </p>
                {outboundByRestaurant.map((r) => (
                  <div
                    key={r.path}
                    className="flex justify-between py-1.5 border-b border-brd text-sm"
                  >
                    <span className="text-txt2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[80%]">
                      {r.path}
                    </span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            )}

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
                      <p className="font-display text-2xl">{device.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-txt2 mt-4">
              Analytics data older than 90 days is automatically deleted daily.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
