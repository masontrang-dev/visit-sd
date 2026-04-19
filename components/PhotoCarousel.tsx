"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { formatRecencyTag } from "@/lib/utils";

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
};

export default function PhotoCarousel({
  photos,
  priority = false,
  recencyTag = null,
  openNow = null,
  mustTry = false,
  aspectClass = "aspect-[3/2]",
  heroName,
  cuisineColor,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollerRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex((prev) => {
        const clamped = Math.max(0, Math.min(photos.length - 1, idx));
        return clamped === prev ? prev : clamped;
      });
    });
  }, [photos.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToIndex = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

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
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x overscroll-x-contain"
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo.url}-${i}`}
            className="relative h-full basis-full grow-0 shrink-0 min-w-full snap-start [scroll-snap-stop:always]"
            style={
              heroName && i === 0
                ? { viewTransitionName: heroName }
                : undefined
            }
          >
            {photo.isStorefront ? (
              <Image
                src={photo.url}
                alt={photo.itemName ?? ""}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                priority={priority}
                className="object-cover"
                unoptimized
              />
            ) : (
              <img
                src={photo.url}
                alt={photo.itemName ?? ""}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            )}

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
            className="text-2xs font-medium px-2 py-1 rounded-pill shadow-sm backdrop-blur-sm tracking-tight uppercase border-2 border-white/80"
            style={{
              backgroundColor: "rgba(250, 238, 218, 0.95)",
              color: "#633806",
            }}
          >
            {recencyTag.text}
          </span>
        )}
        {openNow !== null && (
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
