"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { formatRecencyTag } from "@/lib/utils";
import { isSupabaseUrl } from "@/lib/photo";
import FadeImage from "@/components/FadeImage";

export type RestaurantPhoto = {
  url: string;
  itemName: string | null;
  isStorefront: boolean;
  isRecommended: boolean;
};

type Props = {
  photos: RestaurantPhoto[];
  priority?: boolean;
  recencyTag?: ReturnType<typeof formatRecencyTag>;
  openNow?: boolean | null;
  mustTry?: boolean;
  aspectClass?: string;
  heroName?: string;
  cuisineColor?: string;
  onPhotoClick?: (index: number) => void;
  /** `sizes` attribute for the underlying <Image>. Defaults to the grid-card
   * breakpoints; pass a smaller value for the detail-page hero so Vercel
   * serves a smaller variant (and Safari decodes fewer pixels into memory). */
  sizes?: string;
  /** Whether to apply `backdrop-blur-sm` to the recency / open-now badges.
   * Defaults to true (detail-page hero where the blur visibly mixes with the
   * underlying photo). Pass false from grid cards — the badge bg is already
   * ~95% opaque so the blur isn't visible and costs scroll perf. */
  blurBadges?: boolean;
  /** Image quality forwarded to next/image. Defaults to next/image's 75. Pass
   * 65 from grid cards where the thumbnail size makes the difference
   * imperceptible (10-20% byte savings). The detail hero keeps the default. */
  quality?: number;
};

const DEFAULT_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw";

export default function PhotoCarousel({
  photos,
  priority = false,
  recencyTag = null,
  openNow = null,
  mustTry = false,
  aspectClass = "aspect-[3/2]",
  heroName,
  cuisineColor,
  onPhotoClick,
  sizes = DEFAULT_SIZES,
  blurBadges = true,
  quality,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: "trimSnaps",
    skipSnaps: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  const scrollToIndex = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  // Suppress clicks that happen at the end of a drag/swipe so the lightbox
  // only opens on intentional taps.
  const draggingRef = useRef(false);
  useEffect(() => {
    if (!emblaApi || !onPhotoClick) return;
    const onPointerDown = () => {
      draggingRef.current = false;
    };
    const onScroll = () => {
      draggingRef.current = true;
    };
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("scroll", onScroll);
    return () => {
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("scroll", onScroll);
    };
  }, [emblaApi, onPhotoClick]);

  const handleSlideClick = (i: number) => {
    if (!onPhotoClick) return;
    if (draggingRef.current) return;
    onPhotoClick(i);
  };

  const multiple = photos.length > 1;

  return (
    <div
      className={`relative overflow-hidden ${aspectClass} bg-bg2`}
      style={
        cuisineColor
          ? {
              backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${cuisineColor} 25%, transparent), var(--bg2))`,
            }
          : undefined
      }
    >
      <div
        ref={emblaRef}
        className="h-full w-full overflow-hidden"
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex h-full w-full">
          {photos.map((photo, i) => (
            <div
              key={`${photo.url}-${i}`}
              className={`relative h-full flex-[0_0_100%] min-w-0 ${
                onPhotoClick ? "cursor-pointer" : ""
              }`}
              style={
                heroName && i === 0 ? { viewTransitionName: heroName } : undefined
              }
              onClick={onPhotoClick ? () => handleSlideClick(i) : undefined}
            >
              {Math.abs(i - activeIndex) <= 1 &&
                (() => {
                  const isLcpCandidate = priority && i === 0;
                  return (
                    <FadeImage
                      src={photo.url}
                      alt={photo.itemName ?? ""}
                      fill
                      sizes={sizes}
                      priority={isLcpCandidate}
                      // `fetchPriority` is a native browser hint that elevates
                      // the actual network priority of the image fetch.
                      // `priority` alone only triggers a <link rel=preload>;
                      // adding `fetchpriority=high` tells the browser to also
                      // bump TCP/HTTP priority. Only the genuine LCP slide
                      // gets this — diluting it across multiple images
                      // defeats the purpose.
                      fetchPriority={isLcpCandidate ? "high" : undefined}
                      loading={isLcpCandidate ? undefined : "lazy"}
                      quality={quality}
                      // Grid cards use the default sizes; pass quality=65 from
                      // the consumer when the slide is a thumbnail. Detail
                      // hero (overrides `sizes`) keeps next/image's default.
                      className="object-cover"
                      unoptimized={!isSupabaseUrl(photo.url)}
                      draggable={false}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility =
                          "hidden";
                      }}
                    />
                  );
                })()}

              {/* Bottom-left: item name caption */}
              {photo.itemName && (
                <span className="absolute bottom-2 left-2 max-w-[55%] text-2xs font-medium tracking-tight text-white px-2.5 py-1 rounded-pill bg-black/55 backdrop-blur-md truncate z-[1]">
                  {photo.itemName}
                </span>
              )}

              {/* Bottom-right: recommended badge */}
              {photo.isRecommended && (
                <span className="absolute bottom-2 right-2 text-2xs font-semibold tracking-tight uppercase px-2 py-1 rounded-pill bg-white/95 text-accent shadow-sm border-2 border-white/80 flex items-center gap-1 z-[1]">
                  <span aria-hidden>★</span>
                  <span>Pick</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg/40 to-transparent pointer-events-none" />

      {/* Top-left: must-try (restaurant-level, persists across slides) */}
      <div className="absolute top-2 left-2 flex gap-1.5 z-[2]">
        {mustTry && (
          <span className="text-2xs font-medium px-2 py-1 rounded-pill bg-accent text-white shadow-sm tracking-tight uppercase border-2 border-white/80">
            Must-try
          </span>
        )}
      </div>

      {/* Top-right: recency, open/closed */}
      <div className="absolute top-2 right-2 flex gap-1.5 flex-wrap justify-end z-[2]">
        {recencyTag && (
          <span
            className={`text-2xs font-medium px-2 py-1 rounded-pill shadow-sm tracking-tight uppercase border-2 border-white/80 bg-recency-bg text-recency-txt ${blurBadges ? "backdrop-blur-sm" : ""}`}
          >
            {recencyTag.text}
          </span>
        )}
        {openNow !== null && (
          <span
            className={`text-2xs font-medium px-2 py-1 rounded-pill shadow-sm tracking-tight uppercase border-2 border-white/80 ${
              blurBadges ? "backdrop-blur-sm " : ""
            }${
              openNow
                ? "bg-open-bg text-open-txt"
                : "bg-closed-bg text-closed-txt"
            }`}
          >
            {openNow ? "Open now" : "Closed"}
          </span>
        )}
      </div>

      {/* Bottom-center: dot indicator */}
      {multiple && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-[2] px-2 py-1 rounded-pill bg-black/30 backdrop-blur-sm"
          onClick={(e) => e.preventDefault()}
        >
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to photo ${i + 1}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollToIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? "w-4 bg-white"
                  : "w-1.5 bg-white/60 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
