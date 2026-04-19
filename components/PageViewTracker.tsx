"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

// Skip admin-only surfaces so they don't pollute visitor analytics.
const EXCLUDED_PREFIXES = ["/admin", "/login", "/auth"];

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;
    trackPageView();
  }, [pathname]);

  return null;
}
