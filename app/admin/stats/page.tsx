"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

  useEffect(() => {
    if (!authLoading && isSuperuser) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperuser, authLoading]);

  async function loadStats() {
    setStatsLoading(true);

    const [
      totalsRes,
      viewsByDayRes,
      topPathsRes,
      topReferrersRes,
      geoRes,
      devicesRes,
      topSearchesRes,
      outboundByTypeRes,
      outboundByRestaurantRes,
      cleanupRes,
    ] = await Promise.all([
      supabase.rpc("stats_totals"),
      supabase.rpc("stats_views_by_day", { days: 30 }),
      supabase.rpc("stats_top_paths", { limit_n: 10 }),
      supabase.rpc("stats_top_referrers", { limit_n: 10 }),
      supabase.rpc("stats_geo", { limit_n: 10 }),
      supabase.rpc("stats_devices"),
      supabase.rpc("stats_top_searches", { limit_n: 10 }),
      supabase.rpc("stats_outbound_by_type"),
      supabase.rpc("stats_outbound_by_restaurant", { limit_n: 10 }),
      supabase.rpc("get_last_cleanup_run"),
    ]);

    if (totalsRes.data && totalsRes.data.length > 0) {
      const row = totalsRes.data[0] as {
        total_views: number;
        unique_sessions: number;
      };
      setTotalViews(Number(row.total_views) || 0);
      setUniqueSessions(Number(row.unique_sessions) || 0);
    }

    setViewsByDay(
      ((viewsByDayRes.data ?? []) as { day: string; count: number }[]).map(
        (r) => ({ date: r.day, count: Number(r.count) }),
      ),
    );

    setTopPages(
      ((topPathsRes.data ?? []) as { path: string; count: number }[]).map(
        (r) => ({ path: r.path, count: Number(r.count) }),
      ),
    );

    setTopReferrers(
      ((topReferrersRes.data ?? []) as { referrer: string; count: number }[]).map(
        (r) => ({ referrer: r.referrer, count: Number(r.count) }),
      ),
    );

    setGeoData(
      ((geoRes.data ?? []) as { location: string; count: number }[]).map(
        (r) => ({ location: r.location, count: Number(r.count) }),
      ),
    );

    setDeviceData(
      ((devicesRes.data ?? []) as { device: string; count: number }[]).map(
        (r) => ({ device: r.device, count: Number(r.count) }),
      ),
    );

    setTopSearches(
      ((topSearchesRes.data ?? []) as { query: string; count: number }[]).map(
        (r) => ({ query: r.query, count: Number(r.count) }),
      ),
    );

    setOutboundByType(
      ((outboundByTypeRes.data ?? []) as { label: string; count: number }[]).map(
        (r) => ({ label: r.label, count: Number(r.count) }),
      ),
    );

    setOutboundByRestaurant(
      ((outboundByRestaurantRes.data ?? []) as {
        path: string;
        count: number;
      }[]).map((r) => ({ path: r.path, count: Number(r.count) })),
    );

    if (cleanupRes.data && cleanupRes.data.length > 0) {
      setLastCleanup(cleanupRes.data[0].executed_at);
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
            <p className="text-2xs text-txt2 opacity-60 mt-1">
              Stats aggregated server-side via{" "}
              <code className="font-mono">stats_*</code> RPCs — see{" "}
              <code className="font-mono">MIGRATION_STEP_36_STATS_RPCS.sql</code>.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
