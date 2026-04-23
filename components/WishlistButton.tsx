"use client";

import { useEffect, useRef, useState } from "react";
import { tap, success } from "@/lib/haptics";

type Props = {
  active: boolean;
  onToggle: () => Promise<boolean> | void;
  disabled?: boolean;
  variant?: "icon" | "pill";
  size?: "sm" | "md";
};

export default function WishlistButton({
  active,
  onToggle,
  disabled,
  variant = "pill",
  size = "md",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const prevActiveRef = useRef(active);

  useEffect(() => {
    if (active && !prevActiveRef.current) {
      setPulseKey((k) => k + 1);
    }
    prevActiveRef.current = active;
  }, [active]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy || disabled) return;
    setBusy(true);
    try {
      if (active) {
        tap();
      } else {
        success();
      }
      await onToggle();
    } finally {
      setBusy(false);
    }
  }

  const label = active ? "Remove from wishlist" : "Add to wishlist";
  const heart = active ? "♥" : "♡";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || disabled}
        aria-label={label}
        aria-pressed={active}
        title={label}
        className={`inline-flex items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          size === "sm" ? "w-7 h-7 text-sm" : "w-9 h-9 text-base"
        } ${
          active
            ? "border-accent bg-accent text-white"
            : "border-brd bg-bg text-txt2 hover:text-txt hover:border-txt"
        } ${busy ? "opacity-60 cursor-wait" : ""}`}
      >
        <span
          key={pulseKey}
          aria-hidden
          className="inline-block motion-safe:animate-heart-pulse"
        >
          {heart}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex items-center gap-1.5 chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        active ? "!border-accent !bg-accent !text-white" : ""
      } ${busy ? "opacity-60 cursor-wait" : ""}`}
    >
      <span
        key={pulseKey}
        aria-hidden
        className="inline-block motion-safe:animate-heart-pulse"
      >
        {heart}
      </span>
      {active ? "Wishlisted" : "Want to go"}
    </button>
  );
}
