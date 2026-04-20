"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRestaurantDetail } from "./RestaurantDetailContext";
import SectionNav from "./SectionNav";

export default function StickyHeader() {
  const router = useRouter();
  const { restaurant, cuisineColor, isScrolled, hasScrolled } =
    useRestaurantDetail();

  function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-30 bg-bg/85 backdrop-blur-md border-b border-brd shadow-[0_4px_18px_-12px_rgba(28,28,30,0.22)] transition-transform duration-300 motion-reduce:transition-none ${
        isScrolled ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ visibility: hasScrolled.current ? "visible" : "hidden" }}
    >
      <div
        aria-hidden="true"
        className="h-[3px] w-full"
        style={{ backgroundColor: cuisineColor }}
      />
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/"
            onClick={handleBackClick}
            aria-label="Back"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-brd bg-bg text-txt no-underline transition-colors duration-200 hover:border-accent hover:text-accent hover:bg-bg2"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ←
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="font-display italic text-2xl leading-tight truncate flex items-center gap-2">
              <span className="truncate">{restaurant.name}</span>
              {restaurant.must_try && (
                <span
                  className="text-accent shrink-0 text-lg not-italic"
                  aria-label="Must-try"
                  title="Must-try"
                >
                  ★
                </span>
              )}
            </h2>
            <p className="font-mono text-2xs uppercase tracking-wider text-txt2 truncate mt-0.5">
              {restaurant.cuisine} · {restaurant.neighborhood}
            </p>
          </div>
        </div>
      </div>
      <SectionNav />
    </div>
  );
}
