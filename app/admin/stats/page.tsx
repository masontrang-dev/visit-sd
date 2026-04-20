"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function niceMax(value: number) {
  if (value <= 1) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / mag;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * mag;
}

function StatsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-4 mb-6 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 pr-5 border-[1.5px] border-brd min-w-[140px]"
          >
            <div className="h-3 w-20 bg-bg2 mb-2" />
            <div className="h-8 w-16 bg-bg2" />
          </div>
        ))}
      </div>
      <div className="mb-6">
        <div className="h-3 w-48 bg-bg2 mb-2" />
        <div className="flex items-end gap-0.5 h-32 border-b border-brd pb-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 min-w-[4px] bg-bg2"
              style={{ height: `${20 + ((i * 37) % 70)}%` }}
            />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="mb-6">
          <div className="h-3 w-32 bg-bg2 mb-2" />
          {Array.from({ length: 4 }).map((_, row) => (
            <div
              key={row}
              className="flex justify-between py-1.5 border-b border-brd"
            >
              <div className="h-4 w-1/2 bg-bg2" />
              <div className="h-4 w-8 bg-bg2" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ViewsByDayChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { rawMax, yMax, total, avg, peak, ticks } = useMemo(() => {
    const counts = data.map((d) => d.count);
    const rawMax = counts.length ? Math.max(...counts) : 0;
    const yMax = niceMax(rawMax);
    const total = counts.reduce((a, b) => a + b, 0);
    const avg = counts.length ? total / counts.length : 0;
    const peak = data.reduce(
      (best, d) => (d.count > best.count ? d : best),
      data[0],
    );
    const ticks = [0, 0.5, 1].map((r) => Math.round(yMax * r));
    return { rawMax, yMax, total, avg, peak, ticks };
  }, [data]);

  if (data.length === 0) return null;

  const labelIndexes = data.map((_, i) => i).filter((i) => {
    if (data.length <= 7) return true;
    // First, last, and evenly spaced middle labels
    if (i === 0 || i === data.length - 1) return true;
    const step = Math.max(1, Math.floor(data.length / 5));
    return i % step === 0;
  });

  const hover = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-2 gap-4 flex-wrap">
        <p className="text-2xs tracking-wide uppercase font-medium text-txt2">
          Views per day (last {data.length} days)
        </p>
        <div className="flex gap-4 text-2xs text-txt2">
          <span>
            Total <span className="text-txt font-medium">{total}</span>
          </span>
          <span>
            Avg{" "}
            <span className="text-txt font-medium">
              {avg.toFixed(avg >= 10 ? 0 : 1)}
            </span>
          </span>
          <span>
            Peak <span className="text-txt font-medium">{rawMax}</span>
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Chart area with y-axis labels */}
        <div className="flex gap-2">
          <div className="flex flex-col justify-between items-end h-32 text-2xs text-txt2 py-1 w-6 shrink-0">
            {[...ticks].reverse().map((t) => (
              <span key={t} className="leading-none">
                {t}
              </span>
            ))}
          </div>

          <div className="flex-1 relative h-32">
            {/* Gridlines */}
            {ticks.map((t, i) => (
              <div
                key={t}
                className="absolute left-0 right-0 border-t border-brd"
                style={{ top: `${(1 - i / (ticks.length - 1)) * 100}%` }}
                aria-hidden="true"
              />
            ))}

            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-0.5 pb-px">
              {data.map((d, i) => {
                const h = yMax > 0 ? (d.count / yMax) * 100 : 0;
                const isPeak = d.date === peak.date && d.count > 0;
                const isHovered = hoverIdx === i;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                    aria-label={`${formatShortDate(d.date)}: ${d.count} views`}
                    className={`flex-1 min-w-[4px] rounded-t-sm transition-opacity duration-100 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isHovered || isPeak ? "opacity-100" : "opacity-80"
                    } ${isPeak ? "bg-accent" : "bg-accent/70 hover:bg-accent"}`}
                    style={{ height: `${Math.max(h, 1.5)}%` }}
                  />
                );
              })}
            </div>

            {/* Tooltip */}
            {hover && (
              <div
                className="absolute -top-10 px-2 py-1 bg-txt text-bg text-2xs font-medium rounded-sm pointer-events-none shadow-md z-10 whitespace-nowrap"
                style={{
                  left: `${((hoverIdx! + 0.5) / data.length) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {formatShortDate(hover.date)} · {hover.count} view
                {hover.count !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex gap-0.5 pl-8 mt-1 relative h-4">
          {data.map((d, i) => (
            <div
              key={d.date}
              className="flex-1 min-w-[4px] text-2xs text-txt2 text-center"
            >
              {labelIndexes.includes(i) ? formatShortDate(d.date) : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <StatsSkeleton />
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

            {viewsByDay.length > 0 && <ViewsByDayChart data={viewsByDay} />}

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
