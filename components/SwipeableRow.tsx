"use client";

import { useRef, useState, type ReactNode } from "react";
import { warning } from "@/lib/haptics";

type Props = {
  children: ReactNode;
  onDelete: () => void;
  enabled?: boolean;
  threshold?: number;
  label?: string;
};

export default function SwipeableRow({
  children,
  onDelete,
  enabled = true,
  threshold = 80,
  label = "Delete",
}: Props) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const lockedAxis = useRef<"x" | "y" | null>(null);
  const hapticFired = useRef(false);

  if (!enabled) return <>{children}</>;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    lockedAxis.current = null;
    hapticFired.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (lockedAxis.current === null) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        lockedAxis.current = "y";
      } else if (Math.abs(dx) > 8) {
        lockedAxis.current = "x";
      }
    }
    if (lockedAxis.current !== "x") return;
    const next = Math.max(Math.min(dx, 0), -threshold * 1.5);
    setOffset(next);
    if (!hapticFired.current && next <= -threshold) {
      hapticFired.current = true;
      warning();
    } else if (hapticFired.current && next > -threshold) {
      hapticFired.current = false;
    }
  };

  const handleTouchEnd = () => {
    if (offset <= -threshold) onDelete();
    setOffset(0);
    startX.current = null;
    startY.current = null;
    lockedAxis.current = null;
    hapticFired.current = false;
  };

  const revealed = Math.abs(offset);
  const opacity = Math.min(revealed / threshold, 1);

  return (
    <div className="relative overflow-hidden" style={{ touchAction: "pan-y" }}>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-end bg-accent pr-6 text-white text-xs font-medium uppercase tracking-wide pointer-events-none"
        style={{ opacity }}
      >
        {label}
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 200ms ease-out" : "none",
        }}
        className="relative bg-bg motion-reduce:transition-none"
      >
        {children}
      </div>
    </div>
  );
}
