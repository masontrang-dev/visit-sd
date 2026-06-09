"use client";

import { memo, useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import FadeImage from "@/components/FadeImage";
import { CUISINE_COLORS, buildCuisineColorMap } from "@/lib/cuisine-colors";
import { haversineMiles, formatMiles } from "@/lib/distance";
import { formatFoodTag } from "@/lib/food-tags";
import { isSupabaseUrl } from "@/lib/photo";

export type { RestaurantPhoto };

/**
 * Tracks whether an element is within `rootMargin` of the viewport. Returns a
 * ref to attach to the target plus a boolean that flips `true` the first time
 * the element enters the buffered viewport and stays `true` thereafter
 * (the observer disconnects so we never re-flicker on scroll-back).
 *
 * Pass `initial=true` for cards that should mount eagerly regardless of
 * viewport (e.g. the LCP candidate).
 */
function useNearViewport(rootMargin: string, initial = false) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(initial);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, rootMargin]);

  return [ref, near] as const;
}

type Props = {
  restaurants: Restaurant[];
  grouped: boolean;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  visits?: Record<number, RestaurantVisit[]>;
  recommendedItems?: Record<number, MenuItem[]>;
  restaurantPhotos?: Record<number, RestaurantPhoto[]>;
  imageDisplayMode?: ImageDisplayMode;
  userLocation?: { lat: number; lng: number } | null;
  /** When true, render restaurants in the exact order provided — skips the
   * internal must-try-first / alphabetical sort. Set this when the parent has
   * already applied a sort (e.g. rating, recently visited, near me). */
  preserveOrder?: boolean;
  /** Map from restaurant id to total chain location count. When > 1 the card
   * shows a "N locations" badge indicating there are sibling locations. */
  chainLocationCounts?: Record<number, number>;
};

// React.memo prevents every Card from re-rendering when a single filter chip
// toggles in the parent — only cards whose props actually changed (e.g. the
// newly-mounted/unmounted ones) will re-render. Effective because the parent
// passes stable `restaurant` rows from a Supabase fetch and `useCallback`'d
// onNavigate handlers below.
const Card = memo(function Card({
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
  eagerPrefetch = false,
  heroName,
  userLocation,
  locationCount,
}: {
  r: Restaurant;
  cuisineColor: string;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  visits?: Record<number, RestaurantVisit[]>;
  recommendedItems?: MenuItem[];
  restaurantPhotos?: RestaurantPhoto[];
  imageDisplayMode?: ImageDisplayMode;
  onNavigate?: () => void;
  priority?: boolean;
  /** If true, proactively prefetch this card's detail route on mount.
   * Reserved for the top above-the-fold cards — never the full list. */
  eagerPrefetch?: boolean;
  heroName?: string;
  userLocation?: { lat: number; lng: number } | null;
  locationCount?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (eagerPrefetch) router.prefetch(`/restaurant/${r.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eagerPrefetch, r.id]);
  const isAdmin = !!(onEdit || onOrder);
  const visitCount = visits?.[r.id]?.length ?? 0;
  const recencyTag = formatRecencyTag(r.last_visited);
  const topDishes = recommendedItems?.slice(0, 3) || [];
  const distance =
    userLocation && r.lat != null && r.lng != null
      ? haversineMiles(userLocation.lat, userLocation.lng, r.lat, r.lng)
      : null;

  // Lazy-mount the photo/carousel area: 600px buffer means cards within ~2
  // screens of the viewport are pre-mounted; once mounted, they stay so we
  // never re-flicker on scroll-back. The LCP-priority card mounts eagerly
  // so the first image starts loading immediately.
  const [photoRef, photoNear] = useNearViewport("600px", priority);

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
      // Tap-intent prefetch: onPointerDown fires for mouse/touch/pen ~50-100ms
      // before the click event, giving Next.js a head start on the route work.
      // router.prefetch is idempotent — safe even though Sub-Agent 4's
      // eagerPrefetch already covers the top 6 cards.
      onPointerDown={() => router.prefetch(`/restaurant/${r.id}`)}
      className={`group bg-bg relative border-b border-brd block no-underline cursor-pointer transition-[background-color,box-shadow,transform] duration-200 hover:bg-bg2 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg h-full ${
        imageDisplayMode === "compact" ? "card-contain-compact" : "card-contain"
      }`}
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
                ref={photoRef}
                className="relative overflow-hidden h-[100px] bg-bg2"
                style={{
                  backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${cuisineColor} 25%, transparent), var(--bg2))`,
                }}
              >
                {photoNear && (
                  <FadeImage
                    src={slides[0].url}
                    alt={r.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    priority={priority}
                    // Only the LCP candidate (first card, index 0) gets the
                    // high fetch-priority hint — applying it to every card
                    // would dilute the signal.
                    fetchPriority={priority ? "high" : undefined}
                    // 65 is imperceptible at 100px card thumbnails and trims
                    // 10-20% off the byte size vs the default 75.
                    quality={65}
                    className="object-cover group-hover:scale-105"
                    onError={(e) => {
                      (
                        e.target as HTMLImageElement
                      ).parentElement!.parentElement!.style.display = "none";
                    }}
                    unoptimized={!isSupabaseUrl(slides[0].url)}
                  />
                )}
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
                    <span className="text-2xs font-medium px-2 py-1 rounded-pill shadow-sm tracking-tight uppercase border-2 border-white/80 bg-recency-bg text-recency-txt">
                      {recencyTag.text}
                    </span>
                  )}
                  {openNow !== null && (
                    <span
                      className={`text-2xs font-medium px-2 py-1 rounded-pill shadow-sm tracking-tight uppercase border-2 border-white/80 ${
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

          return photoNear ? (
            <div ref={photoRef}>
              <PhotoCarousel
                photos={slides}
                priority={priority}
                recencyTag={recencyTag}
                openNow={openNow}
                mustTry={!!r.must_try}
                heroName={heroName}
                cuisineColor={cuisineColor}
                blurBadges={false}
                // Grid-card thumbnails are tiny; 65 trims bytes without any
                // perceptible quality loss. Detail hero keeps the default.
                quality={65}
              />
            </div>
          ) : (
            // Placeholder matches PhotoCarousel's default aspect/background so
            // the card height is identical to the eventual rendered version —
            // no layout shift when the real carousel mounts.
            <div
              ref={photoRef}
              className="relative overflow-hidden aspect-[3/2] bg-bg2"
              style={{
                backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${cuisineColor} 25%, transparent), var(--bg2))`,
              }}
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
          {locationCount != null && locationCount > 1 && (
            <span className="text-2xs font-medium px-2 py-0.5 rounded-pill border border-brd text-txt2 tracking-tight">
              📍 {locationCount} locations
            </span>
          )}
          {r.my_rating != null && r.my_rating <= 2 && (
            <span className="text-2xs font-medium px-2 py-0.5 rounded-pill border border-brd text-txt2 tracking-tight opacity-60">
              Not recommended
            </span>
          )}
        </div>

        {/* Ratings row */}
        {(r.google_rating != null || r.my_rating != null) && (
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
            {r.google_rating != null && r.my_rating != null && (
              <div className="w-px h-3 bg-brd" />
            )}
            {r.my_rating != null && (
              <div className="flex items-center gap-1">
                <span className="text-accent">★</span>
                <span className="font-medium text-txt">
                  {r.my_rating.toFixed(1)}/5
                </span>
                <span className="text-txt2">Curators&rsquo;</span>
              </div>
            )}
          </div>
        )}

        {/* Recommended dishes */}
        {topDishes.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap animate-fade-up">
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
          <div className="mt-2 pt-2 border-t border-brd animate-fade-up">
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
});

const gridClass =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 bg-brd border-l border-brd";

/**
 * Plain CSS-Grid render of all restaurant cards. We deliberately do NOT
 * virtualize: at ~100 items the per-card outer DOM is cheap, and native
 * browser scroll restoration handles position perfectly across navigations.
 * Memory savings come from `Card` lazy-mounting its photo/carousel area
 * via `useNearViewport` — only cards within ~600px of the viewport
 * construct an Embla instance + start loading images.
 *
 * Previously we used `VirtuosoGrid`, which caused bottom-of-list flicker as
 * items re-measured during scroll. Lazy-mounting heavy subtrees while
 * keeping the outer grid static eliminates that class of bug entirely.
 */
function FlatCardGrid({
  restaurants,
  cuisineColorMap,
  onEdit,
  onOrder,
  visits,
  recommendedItems,
  restaurantPhotos,
  imageDisplayMode = "full",
  userLocation,
  chainLocationCounts,
}: {
  restaurants: Restaurant[];
  cuisineColorMap: Record<string, string>;
  onEdit?: (r: Restaurant) => void;
  onOrder?: (r: Restaurant) => void;
  visits?: Record<number, RestaurantVisit[]>;
  recommendedItems?: Record<number, MenuItem[]>;
  restaurantPhotos?: Record<number, RestaurantPhoto[]>;
  imageDisplayMode?: ImageDisplayMode;
  userLocation?: { lat: number; lng: number } | null;
  chainLocationCounts?: Record<number, number>;
}) {
  const [activeHeroId, setActiveHeroId] = useState<number | null>(null);
  // Per-id stable onNavigate callbacks: a fresh `() => handleNavigate(id)`
  // each render would give every Card a new function prop and defeat memo.
  // We cache one bound function per restaurant id and reuse it.
  const navigateCacheRef = useRef<Map<number, () => void>>(new Map());
  const getNavigate = useCallback((id: number) => {
    const cache = navigateCacheRef.current;
    let fn = cache.get(id);
    if (!fn) {
      fn = () => setActiveHeroId(id);
      cache.set(id, fn);
    }
    return fn;
  }, []);

  return (
    <div className={gridClass}>
      {restaurants.map((r, i) => (
        <Card
          key={r.id}
          r={r}
          cuisineColor={cuisineColorMap[r.cuisine || ""] || CUISINE_COLORS[0]}
          onEdit={onEdit}
          onOrder={onOrder}
          visits={visits}
          recommendedItems={recommendedItems?.[r.id]}
          restaurantPhotos={restaurantPhotos?.[r.id]}
          imageDisplayMode={imageDisplayMode}
          userLocation={userLocation}
          onNavigate={getNavigate(r.id)}
          priority={i === 0}
          eagerPrefetch={i < 6}
          heroName={
            activeHeroId === r.id && imageDisplayMode === "full"
              ? `hero-${r.id}`
              : undefined
          }
          locationCount={chainLocationCounts?.[r.id]}
        />
      ))}
    </div>
  );
}

export default function RestaurantGrid({
  restaurants,
  grouped,
  onEdit,
  onOrder,
  visits,
  recommendedItems,
  restaurantPhotos,
  imageDisplayMode = "full",
  userLocation,
  preserveOrder,
  chainLocationCounts,
}: Props) {
  const cuisineColorMap = useMemo(
    () => buildCuisineColorMap(restaurants),
    [restaurants],
  );
  const [groupedActiveHeroId, setGroupedActiveHeroId] = useState<number | null>(
    null,
  );
  // Same per-id stable-callback trick as in FlatCardGrid — see comment there.
  const groupedNavigateCacheRef = useRef<Map<number, () => void>>(new Map());
  const getGroupedNavigate = useCallback((id: number) => {
    const cache = groupedNavigateCacheRef.current;
    let fn = cache.get(id);
    if (!fn) {
      fn = () => setGroupedActiveHeroId(id);
      cache.set(id, fn);
    }
    return fn;
  }, []);

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
      <FlatCardGrid
        restaurants={sorted}
        cuisineColorMap={cuisineColorMap}
        onEdit={onEdit}
        onOrder={onOrder}
        visits={visits}
        recommendedItems={recommendedItems}
        restaurantPhotos={restaurantPhotos}
        imageDisplayMode={imageDisplayMode}
        userLocation={userLocation}
        chainLocationCounts={chainLocationCounts}
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
                  visits={visits}
                  recommendedItems={recommendedItems?.[r.id]}
                  restaurantPhotos={restaurantPhotos?.[r.id]}
                  imageDisplayMode={imageDisplayMode}
                  userLocation={userLocation}
                  onNavigate={getGroupedNavigate(r.id)}
                  priority={i === 0 && j === 0}
                  eagerPrefetch={i === 0 && j < 6}
                  heroName={
                    groupedActiveHeroId === r.id && imageDisplayMode === "full"
                      ? `hero-${r.id}`
                      : undefined
                  }
                  locationCount={chainLocationCounts?.[r.id]}
                />
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
