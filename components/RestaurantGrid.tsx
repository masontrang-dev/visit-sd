"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  VirtuosoGrid,
  type GridStateSnapshot,
} from "react-virtuoso";
import {
  type Restaurant,
  type RestaurantVisit,
  type MenuItem,
} from "@/lib/supabase";
import IllustrationEmpty from "@/components/IllustrationEmpty";
import { formatRecencyTag, formatDisplayName } from "@/lib/utils";
import { isCurrentlyOpen } from "@/lib/google-types";
import { type ImageDisplayMode } from "@/components/FilterBar";
import PhotoCarousel, {
  type RestaurantPhoto,
} from "@/components/PhotoCarousel";
import { CUISINE_COLORS, buildCuisineColorMap } from "@/lib/cuisine-colors";
import { haversineMiles, formatMiles } from "@/lib/distance";
import { formatFoodTag } from "@/lib/food-tags";
import { isSupabaseUrl } from "@/lib/photo";

export type { RestaurantPhoto };

type Props = {
  restaurants: Restaurant[];
  grouped: boolean;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onCheckIn?: (r: Restaurant) => void;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
  recommendedItems?: Record<number, MenuItem[]>;
  restaurantPhotos?: Record<number, RestaurantPhoto[]>;
  imageDisplayMode?: ImageDisplayMode;
  userLocation?: { lat: number; lng: number } | null;
  /** When true, render restaurants in the exact order provided — skips the
   * internal must-try-first / alphabetical sort. Set this when the parent has
   * already applied a sort (e.g. rating, recently visited, near me). */
  preserveOrder?: boolean;
};

function Card({
  r,
  cuisineColor,
  onEdit,
  onOrder,
  visits,
  recommendedItems,
  restaurantPhotos,
  imageDisplayMode = "full",
  onNavigate,
  priority = false,
  heroName,
  userLocation,
}: {
  r: Restaurant;
  cuisineColor: string;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onCheckIn?: (r: Restaurant) => void;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
  recommendedItems?: MenuItem[];
  restaurantPhotos?: RestaurantPhoto[];
  imageDisplayMode?: ImageDisplayMode;
  onNavigate?: () => void;
  priority?: boolean;
  heroName?: string;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const isAdmin = !!(onEdit || onOrder);
  const visitCount = visits?.[r.id]?.length ?? 0;
  const recencyTag = formatRecencyTag(r.last_visited);
  const topDishes = recommendedItems?.slice(0, 3) || [];
  const distance =
    userLocation && r.lat != null && r.lng != null
      ? haversineMiles(userLocation.lat, userLocation.lng, r.lat, r.lng)
      : null;

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
      className="group bg-bg relative border-b border-brd block no-underline cursor-pointer transition-[background-color,box-shadow,transform] duration-200 hover:bg-bg2 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg h-full"
      style={{
        borderLeft: `3px solid ${cuisineColor}`,
      }}
    >
      {imageDisplayMode !== "none" &&
        (() => {
          const openNow = isCurrentlyOpen(r.opening_hours);
          const storefrontUrl = r.photo_url || r.storefront_photo_url;
          const slides: RestaurantPhoto[] = [];
          if (storefrontUrl) {
            slides.push({
              url: storefrontUrl,
              itemName: null,
              isStorefront: true,
              isRecommended: false,
            });
          }
          (restaurantPhotos ?? []).forEach((p) => slides.push(p));

          if (slides.length === 0) return null;

          // Compact mode: single image, no carousel
          if (imageDisplayMode === "compact") {
            return (
              <div
                className="relative overflow-hidden h-[100px] bg-bg2"
                style={{
                  backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${cuisineColor} 25%, transparent), var(--bg2))`,
                }}
              >
                <Image
                  src={slides[0].url}
                  alt={r.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  priority={priority}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (
                      e.target as HTMLImageElement
                    ).parentElement!.parentElement!.style.display = "none";
                  }}
                  unoptimized={!isSupabaseUrl(slides[0].url)}
                />
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg/40 to-transparent pointer-events-none" />
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {r.must_try && (
                    <span className="text-2xs font-medium px-2 py-1 rounded-pill bg-accent text-white shadow-sm tracking-tight uppercase border-2 border-white/80">
                      Must-try
                    </span>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1.5 flex-wrap justify-end">
                  {recencyTag && (
                    <span className="text-2xs font-medium px-2 py-1 rounded-pill shadow-sm backdrop-blur-sm tracking-tight uppercase border-2 border-white/80 bg-recency-bg text-recency-txt">
                      {recencyTag.text}
                    </span>
                  )}
                  {openNow !== null && (
                    <span
                      className={`text-2xs font-medium px-2 py-1 rounded-pill shadow-sm backdrop-blur-sm tracking-tight uppercase border-2 border-white/80 ${
                        openNow
                          ? "bg-open-bg text-open-txt"
                          : "bg-closed-bg text-closed-txt"
                      }`}
                    >
                      {openNow ? "Open now" : "Closed"}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          return (
            <PhotoCarousel
              photos={slides}
              priority={priority}
              recencyTag={recencyTag}
              openNow={openNow}
              mustTry={!!r.must_try}
              heroName={heroName}
              cuisineColor={cuisineColor}
            />
          );
        })()}
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
          {distance != null && (
            <span className="text-2xs font-medium px-2 py-0.5 rounded-pill text-txt2 tracking-tight">
              📍 {formatMiles(distance)}
            </span>
          )}
          {r.food_tags?.map((tag) => (
            <span
              key={`food-tag-${tag}`}
              className="text-2xs font-medium px-2 py-0.5 rounded-pill border border-brd text-txt2 tracking-tight"
            >
              {formatFoodTag(tag)}
            </span>
          ))}
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

        {/* Recommended dishes */}
        {topDishes.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {topDishes.map((item) => (
              <span
                key={item.id}
                className="text-2xs font-medium px-2 py-0.5 rounded-pill tracking-tight bg-pick-bg text-pick-txt"
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
                Added by {formatDisplayName(r.added_by)}
              </p>
            )}
            {r.google_maps_url && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (r.google_maps_url) {
                    const a = document.createElement("a");
                    a.href = r.google_maps_url;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.click();
                  }
                }}
                className="text-2xs font-medium text-accent2 hover:opacity-70 transition-opacity duration-150 bg-transparent border-none cursor-pointer p-0 tracking-tight ml-auto"
              >
                View on Maps ↗
              </button>
            )}
          </div>
        ) : null}

        {/* Visit summary (shown to any logged-in user who has visits loaded) */}
        {visitCount > 0 && (
          <div className="mt-2 pt-2 border-t border-brd">
            <p className="text-xs text-txt2 tracking-tight">
              Visited {visitCount} time{visitCount !== 1 ? "s" : ""}
              {r.last_visited && (
                <span>, last on {formatDate(r.last_visited)}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

const gridClass =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 bg-brd border-l border-brd";

const GRID_STATE_KEY = "visitsd-grid-virtuoso-state";

function InfiniteCardGrid({
  restaurants,
  cuisineColorMap,
  onEdit,
  onOrder,
  onCheckIn,
  visitingId,
  visits,
  recommendedItems,
  restaurantPhotos,
  imageDisplayMode = "full",
  userLocation,
}: {
  restaurants: Restaurant[];
  cuisineColorMap: Record<string, string>;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  onCheckIn?: (r: Restaurant) => void;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
  recommendedItems?: Record<number, MenuItem[]>;
  restaurantPhotos?: Record<number, RestaurantPhoto[]>;
  imageDisplayMode?: ImageDisplayMode;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const [activeHeroId, setActiveHeroId] = useState<number | null>(null);
  const stateRef = useRef<GridStateSnapshot | null>(null);

  // Read the saved Virtuoso scroll snapshot once on mount and immediately
  // remove it from sessionStorage so a hard refresh starts from the top.
  const initialState = useMemo<GridStateSnapshot | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = sessionStorage.getItem(GRID_STATE_KEY);
      if (!raw) return undefined;
      sessionStorage.removeItem(GRID_STATE_KEY);
      return JSON.parse(raw) as GridStateSnapshot;
    } catch {
      return undefined;
    }
  }, []);

  // Persist whatever the latest snapshot is whenever the tab is hidden so we
  // restore correctly even if the user uses the browser back button (which
  // doesn't fire onNavigate).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      if (!stateRef.current) return;
      try {
        sessionStorage.setItem(
          GRID_STATE_KEY,
          JSON.stringify(stateRef.current),
        );
      } catch {}
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const handleNavigate = useCallback((id: number) => {
    setActiveHeroId(id);
    if (!stateRef.current) return;
    try {
      sessionStorage.setItem(GRID_STATE_KEY, JSON.stringify(stateRef.current));
    } catch {}
  }, []);

  return (
    <VirtuosoGrid
      useWindowScroll
      data={restaurants}
      restoreStateFrom={initialState}
      stateChanged={(snap) => {
        stateRef.current = snap;
      }}
      listClassName={gridClass}
      computeItemKey={(_, r) => r.id}
      // Render a buffer outside the visible viewport so quick scrolling
      // doesn't reveal blank gaps. Larger overscan = more DOM, less blanking.
      overscan={400}
      itemContent={(i, r) => (
        <Card
          r={r}
          cuisineColor={cuisineColorMap[r.cuisine || ""] || CUISINE_COLORS[0]}
          onEdit={onEdit}
          onOrder={onOrder}
          onCheckIn={onCheckIn}
          visitingId={visitingId}
          visits={visits}
          recommendedItems={recommendedItems?.[r.id]}
          restaurantPhotos={restaurantPhotos?.[r.id]}
          imageDisplayMode={imageDisplayMode}
          userLocation={userLocation}
          onNavigate={() => handleNavigate(r.id)}
          priority={i === 0}
          heroName={
            activeHeroId === r.id && imageDisplayMode === "full"
              ? `hero-${r.id}`
              : undefined
          }
        />
      )}
    />
  );
}

export default function RestaurantGrid({
  restaurants,
  grouped,
  onEdit,
  onOrder,
  onCheckIn,
  visitingId,
  visits,
  recommendedItems,
  restaurantPhotos,
  imageDisplayMode = "full",
  userLocation,
  preserveOrder,
}: Props) {
  const cuisineColorMap = useMemo(
    () => buildCuisineColorMap(restaurants),
    [restaurants],
  );
  const [groupedActiveHeroId, setGroupedActiveHeroId] = useState<number | null>(
    null,
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

  // Default sort: must-try first, then alphabetical by name.
  // Skip when the parent already applied its own sort order.
  const sorted = preserveOrder
    ? restaurants
    : [...restaurants].sort((a, b) => {
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
        recommendedItems={recommendedItems}
        restaurantPhotos={restaurantPhotos}
        imageDisplayMode={imageDisplayMode}
        userLocation={userLocation}
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
              {byCuisine[cuisine].map((r, j) => (
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
                  restaurantPhotos={restaurantPhotos?.[r.id]}
                  imageDisplayMode={imageDisplayMode}
                  userLocation={userLocation}
                  onNavigate={() => setGroupedActiveHeroId(r.id)}
                  priority={i === 0 && j === 0}
                  heroName={
                    groupedActiveHeroId === r.id && imageDisplayMode === "full"
                      ? `hero-${r.id}`
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
