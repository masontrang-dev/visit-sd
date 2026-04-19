"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
};

type State = {
  pullDistance: number;
  refreshing: boolean;
  threshold: number;
};

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: Options): State {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    let startY: number | null = null;
    let active = false;

    const setDist = (d: number) => {
      pullRef.current = d;
      setPullDistance(d);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      startY = e.touches[0].clientY;
      active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active || startY === null) return;
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0) {
        setDist(0);
        return;
      }
      const resisted = Math.min(delta * 0.5, threshold * 1.5);
      setDist(resisted);
      if (delta > 10) document.body.style.overscrollBehaviorY = "contain";
    };

    const onTouchEnd = async () => {
      if (!active) return;
      active = false;
      document.body.style.overscrollBehaviorY = "";
      const shouldRefresh = pullRef.current >= threshold;
      if (shouldRefresh && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setDist(0);
        }
      } else {
        setDist(0);
      }
      startY = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      document.body.style.overscrollBehaviorY = "";
    };
  }, [threshold, enabled]);

  return { pullDistance, refreshing, threshold };
}
