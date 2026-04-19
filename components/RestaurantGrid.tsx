"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  type Restaurant,
  type RestaurantVisit,
  type MenuItem,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import IllustrationEmpty from "@/components/IllustrationEmpty";
import { formatRecencyTag } from "@/lib/utils";
import { isCurrentlyOpen } from "@/lib/google-types";
import { type ImageDisplayMode } from "@/components/FilterBar";

type Props = {
  restaurants: Restaurant[];
  grouped: boolean;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onCheckIn?: (r: Restaurant) => void;
  mustTryFilter?: boolean;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
  baseDelay?: number;
  recommendedItems?: Record<number, MenuItem[]>;
  imageDisplayMode?: ImageDisplayMode;
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

function buildCuisineColorMap(
  restaurants: Restaurant[],
): Record<string, string> {
  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const map: Record<string, string> = {};
  cuisines.forEach((c, i) => {
    map[c as string] = CUISINE_COLORS[i % CUISINE_COLORS.length];
  });
  return map;
}

function Card({
  r,
  cuisineColor,
  onEdit,
  onOrder,
  onCheckIn,
  visitingId,
  visits,
  recommendedItems,
  imageDisplayMode = "full",
  onNavigate,
}: {
  r: Restaurant;
  cuisineColor: string;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onCheckIn?: (r: Restaurant) => void;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
  recommendedItems?: MenuItem[];
  imageDisplayMode?: ImageDisplayMode;
  onNavigate?: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const isAdmin = !!(onEdit || onOrder);
  const restaurantVisits = visits?.[r.id] || [];
  const visitCount = restaurantVisits.length;
  const recencyTag = formatRecencyTag(r.last_visited);
  const topDishes = recommendedItems?.slice(0, 3) || [];

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
      onClick={() => onNavigate?.()}
      className="group bg-bg relative border-b border-brd block no-underline cursor-pointer transition-all duration-150 hover:bg-bg2 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-[0.98]"
      style={{
        borderLeft: `3px solid ${cuisineColor}`,
      }}
    >
      {(r.photo_url || r.storefront_photo_url) &&
        imageDisplayMode !== "none" && (
          <div
            className={`relative overflow-hidden ${
              imageDisplayMode === "compact" ? "h-[100px]" : "aspect-[3/2]"
            }`}
          >
            <Image
              src={(r.photo_url || r.storefront_photo_url)!}
              alt={r.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (
                  e.target as HTMLImageElement
                ).parentElement!.parentElement!.style.display = "none";
              }}
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg/40 to-transparent pointer-events-none" />

            {/* Top-left badges */}
            <div className="absolute top-2 left-2 flex gap-1.5">
              {r.must_try && (
                <span className="text-2xs font-medium px-2 py-1 rounded-pill bg-accent text-white shadow-sm tracking-tight uppercase border-2 border-white/80">
                  Must-try
                </span>
              )}
            </div>

            {/* Top-right badges */}
            <div className="absolute top-2 right-2 flex gap-1.5 flex-wrap justify-end">
              {recencyTag && (
                <span
                  className="text-2xs font-medium px-2 py-1 rounded-pill shadow-sm backdrop-blur-sm tracking-tight uppercase border-2 border-white/80"
                  style={{
                    backgroundColor: "rgba(250, 238, 218, 0.95)",
                    color: "#633806",
                  }}
                >
                  {recencyTag.text}
                </span>
              )}
              {(() => {
                const openNow = isCurrentlyOpen(r.opening_hours);
                if (openNow === null) return null;
                return (
                  <span
                    className="text-2xs font-medium px-2 py-1 rounded-pill shadow-sm backdrop-blur-sm tracking-tight uppercase border-2 border-white/80"
                    style={{
                      backgroundColor: openNow
                        ? "rgba(234, 243, 222, 0.95)"
                        : "rgba(241, 239, 232, 0.95)",
                      color: openNow ? "#27500A" : "#5F5E5A",
                    }}
                  >
                    {openNow ? "Open now" : "Closed"}
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      <div className="p-4">
        {/* Name + price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl leading-none text-txt">
            {r.name}
          </h3>
          <span
            className="text-xs font-medium shrink-0 px-1.5 py-0.5 rounded-pill tracking-tight"
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
              className="text-2xs font-medium px-2 py-0.5 rounded-pill tracking-tight uppercase"
              style={{
                color: cuisineColor,
                backgroundColor: `color-mix(in srgb, ${cuisineColor} 12%, transparent)`,
              }}
            >
              {r.cuisine}
            </span>
          )}
          {r.neighborhood && (
            <span className="text-2xs font-medium px-2 py-0.5 rounded-pill text-txt2 tracking-tight flex items-center gap-1">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: cuisineColor }}
              />
              {r.neighborhood}
            </span>
          )}
        </div>

        {/* Ratings row */}
        {(r.google_rating || r.my_rating) && (
          <div className="flex items-center gap-2.5 mt-2 flex-wrap text-xs">
            {r.google_rating && (
              <div className="flex items-center gap-1">
                <span className="text-accent">★</span>
                <span className="font-medium text-txt">
                  {r.google_rating.toFixed(1)}
                </span>
                <span className="text-txt2">Google</span>
              </div>
            )}
            {r.google_rating && r.my_rating && (
              <div className="w-px h-3 bg-brd" />
            )}
            {r.my_rating && (
              <div className="flex items-center gap-1">
                <span className="text-accent">★</span>
                <span className="font-medium text-txt">{r.my_rating}/5</span>
                <span className="text-txt2">Curators&rsquo;</span>
              </div>
            )}
          </div>
        )}

        {/* Note (truncated) */}
        {r.note && (
          <p
            className="mt-2 text-xs text-txt2 leading-relaxed italic line-clamp-2 border-l-2 pl-2"
            style={{ borderColor: cuisineColor }}
          >
            {r.note}
          </p>
        )}

        {/* Recommended dishes */}
        {topDishes.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {topDishes.map((item) => (
              <span
                key={item.id}
                className="text-2xs font-medium px-2 py-0.5 rounded-pill tracking-tight"
                style={{
                  backgroundColor: "#E1F5EE",
                  color: "#085041",
                }}
              >
                {item.name}
              </span>
            ))}
          </div>
        )}

        {/* Added by (admin only) and View on Maps */}
        {(isAdmin && r.added_by) || r.google_maps_url ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            {isAdmin && r.added_by && (
              <p className="text-2xs text-txt2 opacity-50 tracking-tight">
                Added by {r.added_by}
              </p>
            )}
            {r.google_maps_url && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (r.google_maps_url) {
                    window.open(
                      r.google_maps_url,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
                className="text-2xs font-medium text-accent2 hover:opacity-70 transition-opacity duration-150 bg-transparent border-none cursor-pointer p-0 tracking-tight ml-auto"
              >
                View on Maps ↗
              </button>
            )}
          </div>
        ) : null}

        {/* Admin: visit history */}
        {isAdmin && visitCount > 0 && (
          <div className="mt-2 pt-2 border-t border-brd">
            <p className="text-xs text-txt2 tracking-tight">
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
                className="mt-1 text-xs text-accent2 font-medium bg-transparent border-none cursor-pointer p-0 tracking-tight"
              >
                {showHistory ? "Hide" : "Show"} history
              </button>
            )}
            {showHistory && (
              <div className="mt-2 space-y-1">
                {restaurantVisits.map((visit) => (
                  <p key={visit.id} className="text-xs text-txt2">
                    • {formatDate(visit.visited_at)} by {visit.visited_by}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("animate-fade-up");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FadeUpCard({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const ref = useFadeUp();
  return (
    <div
      ref={ref}
      className="opacity-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const gridClass =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 bg-brd border-l border-brd";

const BATCH_SIZE = 12;

const SCROLL_STORAGE_KEY = "visitsd-grid-scroll";
const SCROLL_POS_KEY = SCROLL_STORAGE_KEY + "-pos";

function InfiniteCardGrid({
  restaurants,
  cuisineColorMap,
  onEdit,
  onOrder,
  onCheckIn,
  visitingId,
  visits,
  baseDelay = 0,
  recommendedItems,
  imageDisplayMode = "full",
}: {
  restaurants: Restaurant[];
  cuisineColorMap: Record<string, string>;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onCheckIn?: (r: Restaurant) => void;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
  baseDelay?: number;
  recommendedItems?: Record<number, MenuItem[]>;
  imageDisplayMode?: ImageDisplayMode;
}) {
  const [visibleCount, setVisibleCount] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) {
        return Math.max(parseInt(saved, 10), BATCH_SIZE);
      }
    } catch {}
    return BATCH_SIZE;
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevRestaurantIdsRef = useRef<string>("");
  const restoredRef = useRef(false);
  const [isRestoring] = useState(() => {
    try {
      return !!sessionStorage.getItem(SCROLL_POS_KEY);
    } catch {
      return false;
    }
  });

  // Restore scroll position after the grid has rendered with the saved visible count
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(SCROLL_POS_KEY);
      sessionStorage.removeItem(SCROLL_STORAGE_KEY);
      sessionStorage.removeItem(SCROLL_POS_KEY);
      if (raw) {
        const scrollY = parseInt(raw, 10);
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    } catch {}
  }, []);

  // Reset visible count only when the actual restaurant list changes (not on re-renders)
  useEffect(() => {
    const currentIds = restaurants.map((r) => r.id).join(",");
    if (prevRestaurantIdsRef.current !== currentIds) {
      // Don't reset if this is the initial load (restoration case)
      if (prevRestaurantIdsRef.current !== "") {
        setVisibleCount(BATCH_SIZE);
      }
      prevRestaurantIdsRef.current = currentIds;
    }
  }, [restaurants]);

  const loadMore = useCallback(() => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) =>
        Math.min(prev + BATCH_SIZE, restaurants.length),
      );
      setIsLoadingMore(false);
    }, 100);
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

  const handleNavigate = useCallback(() => {
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(visibleCount));
      sessionStorage.setItem(SCROLL_POS_KEY, String(window.scrollY));
    } catch {}
  }, [visibleCount]);

  return (
    <>
      <div className={gridClass}>
        {visible.map((r, i) => {
          const card = (
            <Card
              r={r}
              cuisineColor={
                cuisineColorMap[r.cuisine || ""] || CUISINE_COLORS[0]
              }
              onEdit={onEdit}
              onOrder={onOrder}
              onCheckIn={onCheckIn}
              visitingId={visitingId}
              visits={visits}
              recommendedItems={recommendedItems?.[r.id]}
              imageDisplayMode={imageDisplayMode}
              onNavigate={handleNavigate}
            />
          );
          return isRestoring ? (
            <div key={r.id}>{card}</div>
          ) : (
            <FadeUpCard key={r.id} delay={(i % BATCH_SIZE) * 50 + baseDelay}>
              {card}
            </FadeUpCard>
          );
        })}
      </div>
      {hasMore && (
        <>
          <div ref={sentinelRef} className="h-px" />
          {isLoadingMore && (
            <div className="py-6 flex justify-center">
              <div className="flex items-center gap-2 text-txt2 text-sm">
                <div className="w-4 h-4 border-2 border-txt2 border-t-transparent rounded-full animate-spin" />
                Loading more...
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function RestaurantGrid({
  restaurants,
  grouped,
  onEdit,
  onOrder,
  onCheckIn,
  mustTryFilter,
  visitingId,
  visits,
  baseDelay,
  recommendedItems,
  imageDisplayMode = "full",
}: Props) {
  const cuisineColorMap = useMemo(
    () => buildCuisineColorMap(restaurants),
    [restaurants],
  );

  if (restaurants.length === 0) {
    return (
      <div className="py-16 px-6 text-center animate-fade-up">
        <IllustrationEmpty className="mx-auto mb-4" />
        <p className="font-display text-2xl text-txt mb-2">NO SPOTS FOUND</p>
        <p className="text-txt2 text-base max-w-[280px] mx-auto">
          {grouped
            ? "Add your first recommendation to get started"
            : "Try adjusting your filters or search to find what you're looking for"}
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
        onCheckIn={onCheckIn}
        visitingId={visitingId}
        visits={visits}
        baseDelay={baseDelay}
        recommendedItems={recommendedItems}
        imageDisplayMode={imageDisplayMode}
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
              <span className="font-display text-xl tracking-tight">
                {cuisine}
              </span>
              <span className="text-sm text-txt2 ml-2.5">
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
                  onCheckIn={onCheckIn}
                  visitingId={visitingId}
                  visits={visits}
                  recommendedItems={recommendedItems?.[r.id]}
                  imageDisplayMode={imageDisplayMode}
                />
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
