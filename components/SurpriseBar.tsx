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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="relative">
        <button
          onClick={handleSurprise}
          disabled={isAnimating}
          className={`text-xs font-medium px-3 py-1.5 rounded-pill bg-txt text-bg border-[1.5px] border-txt shadow-lg transition-all duration-150 hover:opacity-90 active:scale-95 ${isAnimating ? "opacity-50" : ""}`}
        >
          Surprise me from these {restaurants.length} ✦
        </button>
        <button
          onClick={() => {
            const filterText = window.location.search;
            const shareUrl = `${window.location.origin}${filterText}`;
            navigator.clipboard.writeText(shareUrl);
          }}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-pill border-[1.5px] border-brd text-txt2 bg-bg2 shadow-lg transition-all duration-150 hover:border-txt hover:text-txt"
        >
          Share list
        </button>
      </div>
    </div>
  );
}
