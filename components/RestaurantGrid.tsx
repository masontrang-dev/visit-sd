"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { type Restaurant, type RestaurantVisit } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type Props = {
  restaurants: Restaurant[];
  grouped: boolean;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  mustTryFilter?: boolean;
  onMarkVisited?: (id: number, visitedBy: string) => Promise<void>;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
};

const CUISINE_COLORS = [
  "var(--cuisine-1)",
  "var(--cuisine-2)",
  "var(--cuisine-3)",
  "var(--cuisine-4)",
  "var(--cuisine-5)",
  "var(--cuisine-6)",
  "var(--cuisine-7)",
  "var(--cuisine-8)",
  "var(--cuisine-9)",
  "var(--cuisine-10)",
];

function buildCuisineColorMap(restaurants: Restaurant[]): Record<string, string> {
  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const map: Record<string, string> = {};
  cuisines.forEach((c, i) => {
    map[c as string] = CUISINE_COLORS[i % CUISINE_COLORS.length];
  });
  return map;
}

function MarkVisitedButton({
  restaurantId,
  onMarkVisited,
  visitingId,
}: {
  restaurantId: number;
  onMarkVisited: (id: number, visitedBy: string) => Promise<void>;
  visitingId?: number | null;
}) {
  const { username } = useAuth();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (username) {
          onMarkVisited(restaurantId, username);
        }
      }}
      disabled={visitingId === restaurantId}
      className={`text-[13px] font-medium py-1.5 px-3 rounded-pill border-[1.5px] font-body h-[38px] flex items-center justify-center ${visitingId === restaurantId ? "cursor-default opacity-30 bg-transparent border-brd text-txt2" : "cursor-pointer bg-accent2 text-white border-accent2"}`}
    >
      {visitingId === restaurantId ? "Marking..." : "✓ Mark as Visited"}
    </button>
  );
}

function Card({
  r,
  cuisineColor,
  onEdit,
  onOrder,
  onMarkVisited,
  visitingId,
  visits,
}: {
  r: Restaurant;
  cuisineColor: string;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onMarkVisited?: (id: number, visitedBy: string) => Promise<void>;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const isAdmin = !!(onEdit || onMarkVisited || onOrder);
  const restaurantVisits = visits?.[r.id] || [];
  const visitCount = restaurantVisits.length;

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return (
    <Link
      href={`/restaurant/${r.id}`}
      className="bg-bg relative border-b border-brd block no-underline cursor-pointer transition-all duration-150 hover:bg-bg2 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ borderLeft: `3px solid ${cuisineColor}` }}
    >
      {r.photo_url && (
        <div className="relative">
          <img
            src={r.photo_url}
            alt={r.name}
            loading="lazy"
            className="w-full h-[100px] object-cover block"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display =
                "none";
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg/40 to-transparent pointer-events-none" />
        </div>
      )}
      <div className="p-4">
        {/* Name + price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[24px] leading-none text-txt">
            {r.name}
          </h3>
          <span
            className="text-[11px] font-medium shrink-0 px-1.5 py-0.5 rounded-pill tracking-[0.03em]"
            style={{
              color: cuisineColor,
              backgroundColor: `color-mix(in srgb, ${cuisineColor} 10%, transparent)`,
            }}
          >
            {r.price}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {r.cuisine && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-pill tracking-[0.05em] uppercase"
              style={{
                color: cuisineColor,
                backgroundColor: `color-mix(in srgb, ${cuisineColor} 12%, transparent)`,
              }}
            >
              {r.cuisine}
            </span>
          )}
          {r.neighborhood && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-pill border-[1.5px] border-brd text-txt2 tracking-[0.05em] uppercase flex items-center gap-1">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: cuisineColor }}
              />
              {r.neighborhood}
            </span>
          )}
          {r.must_try && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-accent text-white tracking-[0.05em] uppercase">
              ★ Must-Try
            </span>
          )}
        </div>

        {/* Note (truncated) */}
        {r.note && (
          <p className="mt-2 text-[13px] text-txt2 leading-relaxed border-t border-brd pt-2 italic line-clamp-2">
            {r.note}
          </p>
        )}

        {/* Address + added by (smaller) */}
        {r.address && (
          <p className="mt-1.5 text-[11px] text-txt2 opacity-70">{r.address}</p>
        )}
        {r.added_by && (
          <p className="mt-1 text-[10px] text-txt2 opacity-50 tracking-[0.05em]">
            Added by {r.added_by}
          </p>
        )}

        {/* Google Maps link */}
        {r.google_maps_url && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (r.google_maps_url) {
                window.open(r.google_maps_url, "_blank", "noopener,noreferrer");
              }
            }}
            className="inline-block mt-2 text-[12px] font-medium py-1 px-2.5 rounded-pill border-[1.5px] border-accent2 bg-transparent text-accent2 cursor-pointer hover:bg-accent2 hover:text-white transition-colors duration-150"
          >
            View on Maps ↗
          </button>
        )}

        {/* Admin: visit history */}
        {isAdmin && visitCount > 0 && (
          <div className="mt-2 pt-2 border-t border-brd">
            <p className="text-[11px] text-txt2 tracking-[0.05em]">
              Visited {visitCount} time{visitCount !== 1 ? "s" : ""}
              {r.last_visited && (
                <span>, last on {formatDate(r.last_visited)}</span>
              )}
            </p>
            {visitCount > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                className="mt-1 text-[11px] text-accent2 font-medium bg-transparent border-none cursor-pointer p-0 tracking-[0.05em]"
              >
                {showHistory ? "Hide" : "Show"} history
              </button>
            )}
            {showHistory && (
              <div className="mt-2 space-y-1">
                {restaurantVisits.map((visit) => (
                  <p key={visit.id} className="text-[11px] text-txt2">
                    • {formatDate(visit.visited_at)} by {visit.visited_by}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin actions */}
        {onMarkVisited && (
          <div className="flex gap-2 mt-2 items-center">
            <MarkVisitedButton
              restaurantId={r.id}
              onMarkVisited={onMarkVisited}
              visitingId={visitingId}
            />
            {onOrder && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOrder(r);
                }}
                className="text-[13px] font-medium py-1.5 px-3 rounded-pill border-[1.5px] bg-accent text-white border-accent font-body h-[38px] flex items-center justify-center"
              >
                + Order
              </button>
            )}
          </div>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(r);
            }}
            className={`absolute ${onMarkVisited ? "bottom-[72px]" : "bottom-4"} right-4 bg-transparent border-none cursor-pointer text-sm text-txt2 font-body opacity-60 p-0`}
            title="Edit"
          >
            Edit
          </button>
        )}
      </div>
    </Link>
  );
}

const gridClass =
  "grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-0 bg-brd border-l border-brd";

const BATCH_SIZE = 12;

function InfiniteCardGrid({
  restaurants,
  cuisineColorMap,
  onEdit,
  onOrder,
  onMarkVisited,
  visitingId,
  visits,
}: {
  restaurants: Restaurant[];
  cuisineColorMap: Record<string, string>;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onMarkVisited?: (id: number, visitedBy: string) => Promise<void>;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
}) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when restaurant list changes (e.g. filter applied)
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [restaurants]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, restaurants.length));
  }, [restaurants.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const visible = restaurants.slice(0, visibleCount);
  const hasMore = visibleCount < restaurants.length;

  return (
    <>
      <div className={gridClass}>
        {visible.map((r) => (
          <Card
            key={r.id}
            r={r}
            cuisineColor={cuisineColorMap[r.cuisine || ""] || CUISINE_COLORS[0]}
            onEdit={onEdit}
            onOrder={onOrder}
            onMarkVisited={onMarkVisited}
            visitingId={visitingId}
            visits={visits}
          />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center">
          <button
            onClick={loadMore}
            className="font-body text-[13px] font-medium py-2 px-5 rounded-pill border-[1.5px] border-brd bg-transparent text-txt2 cursor-pointer hover:border-txt hover:text-txt transition-all duration-[0.12s]"
          >
            Show more ({restaurants.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </>
  );
}

export default function RestaurantGrid({
  restaurants,
  grouped,
  onEdit,
  onOrder,
  mustTryFilter,
  onMarkVisited,
  visitingId,
  visits,
}: Props) {
  const cuisineColorMap = useMemo(
    () => buildCuisineColorMap(restaurants),
    [restaurants],
  );

  if (restaurants.length === 0) {
    return (
      <div className="py-12 px-6 text-center">
        <p className="font-display text-5xl text-brd mb-3">NO SPOTS YET</p>
        <p className="text-txt2 text-[15px]">
          {grouped
            ? "Add your first recommendation"
            : "No spots in this category"}
        </p>
      </div>
    );
  }

  // Sort: must-try first, then alphabetical by name
  const sorted = [...restaurants].sort((a, b) => {
    if (a.must_try && !b.must_try) return -1;
    if (!a.must_try && b.must_try) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  if (!grouped) {
    return (
      <InfiniteCardGrid
        restaurants={sorted}
        cuisineColorMap={cuisineColorMap}
        onEdit={onEdit}
        onOrder={onOrder}
        onMarkVisited={onMarkVisited}
        visitingId={visitingId}
        visits={visits}
      />
    );
  }

  const byCuisine: Record<string, Restaurant[]> = {};
  sorted.forEach((r) => {
    const c = r.cuisine || "Other";
    if (!byCuisine[c]) byCuisine[c] = [];
    byCuisine[c].push(r);
  });

  return (
    <>
      {Object.keys(byCuisine)
        .sort()
        .map((cuisine, i) => (
          <section key={cuisine}>
            <div
              className={`py-4 px-6 pb-2 ${i === 0 ? "" : "border-t-2 border-txt"}`}
            >
              <span className="font-display text-[22px] tracking-[0.04em]">
                {cuisine}
              </span>
              <span className="text-[13px] text-txt2 ml-2.5">
                {byCuisine[cuisine].length} spot
                {byCuisine[cuisine].length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className={gridClass}>
              {byCuisine[cuisine].map((r) => (
                <Card
                  key={r.id}
                  r={r}
                  cuisineColor={
                    cuisineColorMap[r.cuisine || ""] || CUISINE_COLORS[0]
                  }
                  onEdit={onEdit}
                  onOrder={onOrder}
                  onMarkVisited={onMarkVisited}
                  visitingId={visitingId}
                  visits={visits}
                />
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
