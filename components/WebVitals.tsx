"use client";
// Core Web Vitals "good" thresholds (Web Vitals 2024):
// LCP < 2.5s, INP < 200ms, CLS < 0.1, FCP < 1.8s, TTFB < 800ms
import { useReportWebVitals } from "next/web-vitals";

export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[web-vital]", metric.name, Math.round(metric.value), metric);
    }
    // Production: no-op for now. When user approves Speed Insights, swap this
    // for a beacon to vitals.vercel-insights.com (or use the dedicated package).
  });
  return null;
}
