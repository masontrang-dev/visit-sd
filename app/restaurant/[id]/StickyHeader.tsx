"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRestaurantDetail } from "./RestaurantDetailContext";

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
      className={`fixed top-0 left-0 right-0 z-30 bg-bg border-b-2 border-txt transition-transform duration-300 motion-reduce:transition-none ${
        isScrolled ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ visibility: hasScrolled.current ? "visible" : "hidden" }}
    >
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ backgroundColor: cuisineColor }}
      />
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/"
            onClick={handleBackClick}
            className="text-txt no-underline shrink-0"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl leading-tight truncate flex items-center gap-2">
              <span className="truncate">{restaurant.name}</span>
              {restaurant.must_try && (
                <span
                  className="text-accent shrink-0 text-lg"
                  aria-label="Must-try"
                  title="Must-try"
                >
                  ★
                </span>
              )}
            </h2>
            <p className="text-xs text-txt2 truncate">
              {restaurant.cuisine} · {restaurant.neighborhood}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
