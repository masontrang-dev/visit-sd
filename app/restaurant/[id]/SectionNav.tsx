"use client";

import { useEffect, useMemo, useState } from "react";
import { useRestaurantDetail } from "./RestaurantDetailContext";

// "top" is a pseudo-section that always scrolls to the top of the page — it
// has no DOM anchor. The rest are real section ids and must exist in the
// page for the tab to appear.
const TOP_ID = "top";
const ALL_SECTIONS: { id: string; label: string }[] = [
  { id: TOP_ID, label: "Top" },
  { id: "recommended-items", label: "Recommended" },
];

// Scroll offset reserves space for the combined sticky header (title row +
// section tabs) so anchored targets land below the chrome rather than behind
// it. Measured empirically — adjust if the header padding/typography changes.
const SCROLL_OFFSET = 128;

export default function SectionNav() {
  const { cuisineColor } = useRestaurantDetail();
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Detect which real sections rendered. `recommended-items` mounts only
  // after async data lands — after SectionNav itself mounts — so observe
  // the DOM and re-detect. "Top" is always present when any real section is.
  useEffect(() => {
    const detect = () => {
      const realPresent = ALL_SECTIONS.filter((s) => s.id !== TOP_ID)
        .map((s) => s.id)
        .filter((id) => document.getElementById(id));
      const present = realPresent.length > 0 ? [TOP_ID, ...realPresent] : [];
      setPresentIds((prev) =>
        prev.length === present.length && prev.every((v, i) => v === present[i])
          ? prev
          : present,
      );
      setActiveId((prev) => prev ?? present[0] ?? null);
    };

    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Active-section tracking. Each scroll, pick the last section whose top
  // has crossed the anchor line (just below the sticky header). This matches
  // typical TOC behavior and is more reliable than IntersectionObserver for
  // rapid scrolls — the observer can fire a single "exit" event without a
  // matching "enter" and leave the highlight stuck on the previous tab.
  useEffect(() => {
    if (presentIds.length === 0) return;

    const compute = () => {
      const line = SCROLL_OFFSET + 8;
      let current = presentIds[0];
      for (const id of presentIds) {
        if (id === TOP_ID) continue;
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = id;
        else break;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [presentIds]);

  const sections = useMemo(
    () => ALL_SECTIONS.filter((s) => presentIds.includes(s.id)),
    [presentIds],
  );

  if (sections.length < 2) return null;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    if (id === TOP_ID) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveId(id);
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
  }

  return (
    <nav
      aria-label="Page sections"
      className="border-t border-brd"
    >
      <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide">
        {sections.map((s) => {
          const active = activeId === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleClick(e, s.id)}
              aria-current={active ? "true" : undefined}
              className={`shrink-0 text-2xs font-medium tracking-wide uppercase px-2.5 py-1 rounded-pill border-[1.5px] transition-colors duration-[0.12s] no-underline ${
                active
                  ? "text-bg border-transparent"
                  : "text-txt2 border-brd hover:border-txt hover:text-txt"
              }`}
              style={active ? { backgroundColor: cuisineColor } : undefined}
            >
              {s.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
