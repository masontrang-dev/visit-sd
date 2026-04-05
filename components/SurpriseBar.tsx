"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Restaurant } from "@/lib/supabase";

type Props = {
  restaurants: Restaurant[];
};

export default function SurpriseBar({ restaurants }: Props) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  function handleSurprise() {
    if (restaurants.length === 0 || isAnimating) return;

    setIsAnimating(true);
    const randomIndex = Math.floor(Math.random() * restaurants.length);
    const randomRestaurant = restaurants[randomIndex];

    setTimeout(() => {
      router.push(`/restaurant/${randomRestaurant.id}`);
    }, 300);
  }

  if (restaurants.length === 0) return null;

  return (
    <div className="sticky bottom-0 bg-bg2 border-t-2 border-txt px-6 py-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-20">
      <p className="text-2xs font-medium text-txt2 uppercase tracking-wide mb-1.5">
        Feeling lucky?
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSurprise}
          disabled={isAnimating}
          className={`text-xs font-medium px-3 py-1.5 rounded-pill bg-txt text-bg border-[1.5px] border-txt transition-all duration-150 hover:opacity-90 active:scale-95 ${isAnimating ? "opacity-50" : ""}`}
        >
          Surprise me from these {restaurants.length} ✦
        </button>
        <button
          onClick={() => {
            const filterText = window.location.search;
            const shareUrl = `${window.location.origin}${filterText}`;
            navigator.clipboard.writeText(shareUrl);
          }}
          className="text-xs font-medium px-3 py-1.5 rounded-pill border-[1.5px] border-brd text-txt2 bg-transparent transition-all duration-150 hover:border-txt hover:text-txt"
        >
          Share list
        </button>
      </div>
    </div>
  );
}
