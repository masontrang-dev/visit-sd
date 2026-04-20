"use client";

import { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";

export type LightboxPhoto = {
  url: string;
  title?: string | null;
  subtitle?: string | null;
};

type Props = {
  photos: LightboxPhoto[];
  startIndex: number;
  onClose: () => void;
  header?: string;
};

export default function PhotoLightbox({
  photos,
  startIndex,
  onClose,
  header,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex,
    align: "center",
    loop: false,
    containScroll: "trimSnaps",
  });
  const [activeIndex, setActiveIndex] = useState(startIndex);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
      if (e.key === "ArrowRight") emblaApi?.scrollNext();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [emblaApi, onClose]);

  const scrollToIndex = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  if (photos.length === 0) return null;
  const active = photos[activeIndex];
  const multiple = photos.length > 1;
  const hasCaption = Boolean(active.title || active.subtitle);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute top-0 left-0 right-0 z-[2] flex items-center justify-between gap-3 px-4 py-3 pointer-events-none">
        <div className="flex items-baseline gap-2 min-w-0 text-white">
          {header && (
            <span className="font-display text-lg tracking-tight truncate">
              {header}
            </span>
          )}
          {multiple && (
            <span className="text-xs text-white/60 shrink-0 tabular-nums">
              <span
                className="inline-block text-right"
                style={{ minWidth: `${String(photos.length).length}ch` }}
              >
                {activeIndex + 1}
              </span>
              {" / "}
              {photos.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="pointer-events-auto w-10 h-10 flex items-center justify-center text-white bg-black/40 hover:bg-black/60 rounded-full border-none cursor-pointer backdrop-blur-sm shrink-0"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div
        ref={emblaRef}
        className="flex-1 overflow-hidden"
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex h-full">
          {photos.map((photo, i) => (
            <div
              key={`${photo.url}-${i}`}
              className="relative h-full flex-[0_0_100%] min-w-0 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && onClose()}
            >
              {Math.abs(i - activeIndex) <= 1 && (
                <img
                  src={photo.url}
                  alt={photo.title ?? ""}
                  draggable={false}
                  className="max-w-full max-h-full object-contain select-none"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6 pt-3 text-center text-white">
        {multiple && (
          <div className="flex items-center justify-center gap-1 mb-3">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-200 border-none cursor-pointer ${
                  i === activeIndex
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
        {hasCaption && (
          <>
            <p className="font-display text-xl tracking-tight leading-tight">
              {active.title ?? "\u00A0"}
            </p>
            <p className="text-xs text-white/70 mt-1">
              {active.subtitle ?? "\u00A0"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
