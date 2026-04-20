# VISIT SD — Production Readiness Review

> Reviewed by: Senior Engineering + Design (FANG-level panel)
> Date: April 2026 | Version: 2.0.5
> Scope: Full codebase audit — architecture, visual design, UX, features, dead code

---

## Executive Summary

VISIT SD is a well-designed, thoughtfully built personal guide app with a strong design system and good mobile UX fundamentals. The core stack (Next.js App Router + Supabase + Tailwind) is solid. However, several patterns that worked at small scale will become blockers or liabilities at 1M users/year. The most urgent concerns are: **no server-side rendering for SEO-critical pages**, **a 2,173-line monster component**, **left-in debug console.logs**, **no error boundaries**, **no tests**, and **a stats page that fetches the entire analytics table into memory**. The design layer has hardcoded colors that break dark mode, duplicated constant arrays, and a few confusing interactions that will hurt first-time users.

This review is organized into five areas with a phased remediation plan at the end.

---

## 1. Critical / Blocking Issues

These are issues that will hurt you at scale or expose security risk in production.

### 1.1 Zero Server-Side Rendering — SEO is completely broken

Every meaningful page is `"use client"`, including the restaurant detail page (`app/restaurant/[id]/page.tsx`). This means:
- Google/social crawlers see an empty shell with no restaurant name, no description, no OG image.
- Shareable links (the Share button exists!) produce blank previews.
- No `generateMetadata` function exists on the detail page.

**Fix**: Convert `app/restaurant/[id]/page.tsx` to a server component that fetches the restaurant by ID server-side and generates metadata. Child interactive sections (order history, check-in, curator panel) can be isolated client components.

### 1.2 Production Debug Logs Left In

`app/restaurant/[id]/page.tsx` lines 571–607 (`handleSave`) contain 5 `console.log` calls with full Supabase payloads, including photo URLs and update response data. These leak internal data shapes to any browser dev tools user and pollute production logs.

```typescript
// Lines 571-607 in handleSave:
console.log("Restaurant detail UPDATE payload:", JSON.stringify(entry, null, 2));
console.log("Photo URL being updated:", entry.photo_url);
console.log("Update response:", { data: updateData, error });
console.log("Reloaded restaurant data:", restaurantData);
console.log("Photo URL in reloaded data:", restaurantData.photo_url);
console.log("FULL Photo URL (no truncation):", JSON.stringify(restaurantData.photo_url));
```

### 1.3 Stats Page Fetches the Entire Analytics Table

`app/admin/stats/page.tsx` line 55–58:
```typescript
const { data, error } = await supabase
  .from("page_views")
  .select("*")
  .order("created_at", { ascending: false });
```
This fetches **all rows, unbounded**. At 1M users/year, `page_views` will have tens of millions of rows. This will timeout, exhaust memory, and crash the page. All aggregation is done in JavaScript on the client.

**Fix**: Use Supabase database functions / RPCs or server-side aggregation queries with `GROUP BY`. Never fetch raw analytics rows to the client.

### 1.4 Google Maps API Key Exposed in Server-Only Route

`app/api/refresh-google-data/route.ts` line 8:
```typescript
const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
```
A `NEXT_PUBLIC_` prefixed variable is bundled into the client bundle and is publicly visible in browser source. Using it in a server-side cron route is fine operationally, but it signals a missing separation: this key should be `GOOGLE_MAPS_SERVER_API_KEY` (no `NEXT_PUBLIC_`) to allow different key restrictions for server vs. browser use.

### 1.5 Admin Route Auth Uses Legacy Cookie Mechanism

`app/api/refresh-google-data/route.ts` line 63:
```typescript
const sessionCookie = req.cookies.get("admin_session");
const isAdmin = !!sessionCookie?.value;
```
The app migrated to Supabase OAuth. The `admin_session` cookie no longer exists for any OAuth user, so this auth check for non-cron requests is effectively **always rejected** for admins and only passes for Vercel Cron. This route is functionally broken for manual admin triggers.

### 1.6 No Rate Limiting on `/api/log-view`

The analytics ingestion endpoint has zero rate limiting, no bot detection, and no authentication. A motivated party can flood the table with bogus page views, invalidating all analytics data. The endpoint also makes a **synchronous external HTTP call** to `ipapi.co` on every request, adding 100–300ms to every page view tracking event.

---

## 2. Architectural Issues

### 2.1 Restaurant Detail Page is 2,173 Lines — a Monolith

`app/restaurant/[id]/page.tsx` contains a single component that manages: data loading, redirect logic, edit modal, order modal, check-in modal, confirm modals (2), photo lightbox, curator ratings, visit history, public dish recommendations, curator order history, sticky header scroll state, and the share flow. This makes it untestable, hard to reason about, and causes every state mutation to trigger re-renders of the entire tree.

**Split into**: `<RestaurantHeader>`, `<CuratorTakeSection>`, `<RecommendedItemsSection>`, `<OrderHistorySection>`, `<VisitHistorySection>`, `<StickyHeader>`, `<RestaurantActionBar>`.

### 2.2 CUISINE_COLORS Array is Duplicated in 3 Files

The same 10-element array is copy-pasted into:
- `app/restaurant/[id]/page.tsx` (lines 40–51)
- `components/RestaurantGrid.tsx` (lines 37–48)
- `components/MapView.tsx` (lines 13–24)

Same for `buildCuisineColorMap` which is duplicated in `RestaurantGrid.tsx` and `MapView.tsx`.

**Fix**: Extract to `lib/cuisine-colors.ts` and import everywhere.

### 2.3 `HomeContent` Has Too Many useState Calls

`app/page.tsx` `HomeContent()` has **18 `useState` calls** at the top level, all in a single component. This makes the component fragile — any unrelated state update re-renders the entire page tree. The `load()` function makes 4 sequential Supabase round-trips and manages complex waterfall logic inline.

**Fix**: Extract data-fetching logic into a custom hook (`useHomeData()`), and split filter state into a dedicated `useFilterState()` hook.

### 2.4 No Error Boundaries Anywhere

If any component throws (network error, malformed data, missing env var), the entire app crashes with no recovery. Next.js App Router supports `error.tsx` files and React's `<ErrorBoundary>`. Neither is used.

### 2.5 No `loading.tsx` or `not-found.tsx` Files

Next.js 13+ App Router supports file-based `loading.tsx` (shown during server component loading) and `not-found.tsx` (404 handler). The app has neither. Loading is handled with `useState(true)` patterns in client components, which means a flash of empty content before the skeleton appears.

### 2.6 No Tests

There are zero test files, zero test configuration, no `jest.config`, no `vitest.config`, no Playwright setup. For a public app expected to serve 1M users/year, any regression in core flows (check-in, rating, order logging, visibility changes) is caught only after deployment.

### 2.7 `isAdmin` Conflates Multiple Roles

In `lib/auth-context.tsx` line 137–140:
```typescript
const isAdmin =
  roles.includes("admin") ||
  roles.includes("superuser") ||
  roles.includes("curator");
```
A `curator` is treated as an admin everywhere in the app, which gives curators access to edit restaurants, delete orders, see private/archived entries, and trigger refreshes. The role hierarchy needs clarification and enforcement per-action, not per-page.

### 2.8 `opening_hours` Typed as `any`

In `lib/supabase.ts` line 28: `opening_hours: any | null`. In `AddModal.tsx` line 115: `useState<any>(...)`. The `google-types.ts` file already defines the shape from the Google Places API. This type exists but is not applied to the Restaurant type or the state.

### 2.9 Client-Side Only Check-In Rate Limiting

The 24-hour check-in cooldown (`hasRecentCheckIn`) is computed client-side from fetched visit data. A motivated user can insert directly to the Supabase `restaurant_visits` table via the browser console using the public anon key. Rate limiting should be enforced via a Supabase RLS policy or a server-side API route.

### 2.10 Dependency Versions — Canary React in Production

`package.json` pins to:
```json
"react": "^19.3.0-canary-da9325b5-20260417"
```
A canary build is pre-release and may have breaking bugs. For a public production app, use the latest stable React 19 release.

---

## 3. Visual / UX Issues

### 3.1 Hardcoded Colors That Break Dark Mode

Several components use literal hex colors instead of CSS variables, so they appear identical in light and dark mode (wrong contrast):

- `components/RestaurantGrid.tsx` lines 289–292 (recommended dish pills):
  ```tsx
  style={{ backgroundColor: "#E1F5EE", color: "#085041" }}
  ```
- `components/PhotoCarousel.tsx` lines 180–184 (recency badge):
  ```tsx
  backgroundColor: "rgba(250, 238, 218, 0.95)", color: "#633806"
  ```
- `components/MapView.tsx` lines 112–124 (InfoWindow content):
  ```tsx
  style={{ color: "#1a1a18" }}  // txt color
  style={{ color: "#5f5e5a" }}  // txt2 color
  style={{ color: "#1d9e75" }}  // accent2 color
  ```

**Fix**: Replace with `var(--txt)`, `var(--txt2)`, `var(--accent2)`, and define semantic color tokens for the "success-tint" backgrounds.

### 3.2 Dead Code in viewMode Initialization

`app/page.tsx` lines 153–156:
```typescript
const isMobile = window.innerWidth < 768;
return isMobile ? "list" : "list";  // always "list"!
```
The ternary is a no-op — both branches return `"list"`. This was likely intended to default to "map" on desktop. This is dead code that creates false cognitive overhead for future readers.

### 3.3 Image Mode Toggle is Not Discoverable

The "List" button in `FilterBar.tsx` cycles through `full → compact → none` on repeated clicks while in list mode. There is no indication of this behavior — no tooltip visible by default, no indication of the cycle, no icon that changes meaning. Users have no way to discover this interaction.

**Fix**: Replace with a 3-way segmented control with icons for each mode, or a dropdown menu.

### 3.4 FilterBar Has Too Many Rows on Mobile

The FilterBar has 3+ stacked rows: Search + Add, View + Must-Try, Visibility (admin), and Filters row. On mobile this consumes ~160px of real estate before any content. Consider a collapsed filter bar with a bottom sheet on mobile.

### 3.5 Stats Page Has No Proper Data Visualization

`/admin/stats` renders a homemade bar chart (div heights set by inline style, no labels, no axes, no values on hover) and plain text tables. Given the app already tracks rich analytics (geo, device, searches, outbound clicks), this page is underutilized. At minimum, add value labels on bars and date labels on the x-axis.

### 3.6 Map View Info Window Uses Hard-Coded Font/Colors

The `MapView` `InfoWindow` content is a bare `div` with inline `style={{ color: "#1a1a18" }}` — it ignores dark mode completely. A user in dark mode who clicks a map pin gets a white/light info window with dark text (correct), but the disconnect is jarring and inconsistent.

### 3.7 "Surprise Me" Button Disappears During Active Filters

`app/page.tsx` line 784: `{!isFiltered && viewMode === "list" && <button>Surprise me</button>}`. When users have active filters and want a random pick from the filtered results, the Surprise Me button is hidden — exactly when it would be most useful.

### 3.8 Restaurant Detail Page Has No Section Navigation

The detail page has 5–6 sections (curator take, recommended items, order history, visit history, footer). On mobile, users must scroll through all preceding sections to reach order history. A simple sticky section nav (tab bar or anchor links) would dramatically improve navigation.

### 3.9 No Restaurant-Level OG Image or Per-Page Social Preview

Restaurant detail pages generate no per-restaurant `<title>` or OG tags. Sharing a restaurant link shows the generic app title and description. The `opengraph-image.tsx` is a generic app-level image, not per-restaurant.

### 3.10 Skeleton Screens Are Present Only for List View

The home page has a `SkeletonGrid` and the detail page has an inline skeleton. The map view and admin stats page show plain "Loading..." text with no skeleton, creating an inconsistent loading experience.

---

## 4. Feature Gaps

### 4.1 No Sort Options

The restaurant grid is always sorted: must-try first, then alphabetical. There are no sort controls for: highest Google rating, lowest price, most recently visited, most recently added, or most check-ins. Visitors often want "best-rated" or "nearby in neighborhood X" ordering.

### 4.2 No Occasions Filter

The `occasions` field (casual, date-friendly, family-friendly, etc.) is set per restaurant in the `AddModal` and displayed as pills on the detail page, but there is no `FilterBar` chip for it. This is the most useful filter for a visitor deciding where to eat.

### 4.3 Public Users Have No Social Context

Non-admin visitors see visit counts and order history but have no way to see _who_ the curators are or what they've tried recently. A small public-facing "curators" section or "recently visited" banner could add credibility and personalization without exposing private data.

### 4.4 No Related Restaurant Suggestions

The restaurant detail page ends with visit history and a footer. There is no "Other spots in [neighborhood]" or "More [cuisine] options" section that encourages discovery. This is a high-value retention feature for public users who want to explore.

### 4.5 No "Open Now" Filter

The app fetches and displays open/closed status per card, but there's no filter to show only currently-open restaurants. This is the most requested feature for any restaurant guide.

### 4.6 No PWA Manifest

The layout sets `appleWebApp: { capable: true }` metadata but there is no `manifest.json` file for Android PWA installation (add to home screen), no `theme-color` meta tag, and no icon set for all required PWA sizes.

### 4.7 No Restaurant Detail Page Canonical URL / Structured Data

Restaurant pages have no `<link rel="canonical">` and no JSON-LD `Restaurant` structured data (schema.org). Google cannot index these pages as rich results (star ratings in search, hours, price range, etc.).

### 4.8 Admin Has No Bulk Operations

Admins can only manage one restaurant at a time. Common admin needs like bulk visibility changes, exporting the list as CSV, or bulk-adding Google data are missing.

### 4.9 No User-Facing "Visited" Wishlist

Public users can check in if they have an account, but there's no wishlist/save feature ("Want to go"). This is a retention tool that keeps users coming back.

### 4.10 Geolocation-Based "Near Me" Sorting

All restaurants are San Diego-based but there's no "sort by proximity" when a visitor grants location access. Given the app's primary use case (out-of-town visitors), this would be high-impact.

---

## 5. Dead Code & Technical Debt

### 5.1 Unused Utility Function

`lib/utils.ts` exports `getVisitRecency()` (lines 1–12) which is never imported anywhere. Only `formatRecencyTag()` is used. `getVisitRecency` is dead code.

### 5.2 `app/admin/page.tsx` is Empty

The admin page just redirects to `/`:
```typescript
export default function AdminPage() {
  redirect("/");
}
```
The admin functionality moved to the home page (admin toggle in FilterBar). This page should either be removed or redirect to `/admin/stats`.

### 5.3 `mustTryFilter` Prop on `RestaurantGrid` is Unused

The `Props` type in `RestaurantGrid.tsx` (line 28) includes `mustTryFilter?: boolean`, but the prop is never read anywhere inside the component — filtering is applied externally before passing `restaurants`. This is dead prop definition.

### 5.4 Root Directory is Cluttered with 30+ Migration SQL Files

The repository root contains 30+ SQL files (`MIGRATION_STEP_21.sql` through `MIGRATION_STEP_35_CURATOR_MUST_TRY.sql`) and numerous debug SQL files (`DEBUG_TRIGGER.sql`, `DIAGNOSE_USER_PROFILES.sql`, etc.) alongside 10+ `.md` files that are developer notes. These are cluttering the working tree and will confuse new contributors.

**Fix**: Move all SQL files to `supabase/migrations/` and all design/planning docs to `docs/`.

### 5.5 15+ Development `.md` Files in Repo Root

`FLOW_REVIEW.md`, `OAUTH_MIGRATION_SUMMARY.md`, `ROADMAP.md`, `ROADMAP_1.7.md`, `STANDARDS.md`, `UX_REDESIGN_IMPLEMENTATION.md`, `DESIGN_SYSTEM.md`, `additional-features.md`, `item-ordering.md` etc. should live in a `docs/` directory or a private wiki, not the repo root.

### 5.6 `viewMode` Dead Ternary in `app/page.tsx`

Already noted in §3.2. `isMobile ? "list" : "list"` — the entire `if (typeof window !== "undefined")` block is dead since both branches return `"list"`.

### 5.7 `isRestoring` State in `InfiniteCardGrid` Has No Teardown

`RestaurantGrid.tsx` uses `useState(() => !!sessionStorage.getItem(SCROLL_POS_KEY))` to initialize `isRestoring`, but once restored, this state never changes back to `false`. Cards rendered during restoration skip the `FadeUpCard` animation wrapper forever, even after new data loads. The `[isRestoring]` should become state that resets after restoration completes.

### 5.8 `handleDelete` Uses `window.confirm()`

`app/restaurant/[id]/page.tsx` line 543:
```typescript
if (!restaurant || !confirm(`Delete ${restaurant.name}?`)) return;
```
The native browser `confirm()` dialog blocks the JS thread, is unstyled, cannot be customized, and is considered an anti-pattern in modern web apps. A `ConfirmModal` component already exists in the codebase — this is the one place it's not used.

### 5.9 `AdminViewToggle.tsx` File May Be Orphaned

`components/AdminViewToggle.tsx` exists in the file tree (visible from workspace layout) but is not imported in any of the reviewed files. Needs verification — if unused, should be removed.

### 5.10 `graze/` Directory in Repo Root

An empty `graze/` directory exists in the repo root with no contents. This is likely a leftover artifact and should be removed.

---

## 6. Security Observations

| # | Issue | Severity |
|---|-------|----------|
| 1 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` used as server key — no domain restriction possible for server calls | Medium |
| 2 | `/api/log-view` has no rate limiting — analytics table can be spammed | Medium |
| 3 | `/api/refresh-google-data` admin check uses legacy `admin_session` cookie — broken for OAuth users | High |
| 4 | Check-in rate limiting is client-side only — Supabase anon key is public | Low |
| 5 | `ipapi.co` called synchronously with user IP in `/api/log-view` — user IPs sent to third-party | Low |
| 6 | No Content Security Policy headers configured in `next.config.js` | Medium |
| 7 | No `X-Frame-Options` or `X-Content-Type-Options` headers | Low |

---

## 7. Phased Implementation Plan

### Phase 1 — Critical Fixes (Week 1–2)
*Blocking bugs, data leaks, and broken security*

| Done | Priority | Task | File(s) | Effort |
|------|----------|------|---------|--------|
| [x] | P0 | Remove all `console.log` debug statements | `app/restaurant/[id]/page.tsx` | 1h |
| [x] | P0 | Fix `/api/refresh-google-data` auth — replace legacy cookie check with Supabase session verification | `app/api/refresh-google-data/route.ts` | 2h |
| [x] | P0 | Fix dead ternary `isMobile ? "list" : "list"` | `app/page.tsx` | 15m |
| [x] | P1 | Replace `window.confirm()` with `ConfirmModal` in `handleDelete` | `app/restaurant/[id]/page.tsx` | 30m |
| [x] | P1 | Add rate limiting to `/api/log-view` (simple IP-based, e.g., 10 req/min via Upstash) | `app/api/log-view/route.ts` | 3h |
| [x] | P1 | Move geolocation lookup (`ipapi.co`) to background (fire-and-forget after response) | `app/api/log-view/route.ts` | 1h |
| [x] | P1 | Rename `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` server usage to `GOOGLE_MAPS_SERVER_API_KEY` | `app/api/refresh-google-data/route.ts`, `.env` | 1h |
| [x] | P1 | Add HTTP security headers to `next.config.js` (CSP, X-Frame-Options, X-Content-Type-Options) | `next.config.js` | 2h |

### Phase 2 — Architecture Refactor (Week 3–5)
*Structural changes that unblock SEO, maintainability, and testing*

| Done | Priority | Task | File(s) | Effort |
|------|----------|------|---------|--------|
| [x] | P0 | Convert `app/restaurant/[id]/page.tsx` to a server component with `generateMetadata` for per-restaurant OG tags | `app/restaurant/[id]/` | 1d |
| [x] | P0 | Fix stats page — replace `select("*")` with server-side RPC aggregation queries | `app/admin/stats/page.tsx` | 1d |
| [x] | P1 | Extract `CUISINE_COLORS` and `buildCuisineColorMap` to `lib/cuisine-colors.ts` | 3 files | 1h |
| [x] | P1 | Split `app/restaurant/[id]/page.tsx` into focused sub-components | New files | 2d |
| [x] | P1 | Extract `useHomeData()` and `useFilterState()` hooks from `app/page.tsx` | `app/page.tsx`, new hooks | 1d |
| [x] | P1 | Fix `opening_hours: any` — apply proper TypeScript type from `google-types.ts` | `lib/supabase.ts`, `AddModal.tsx` | 2h |
| [x] | P1 | Add `app/error.tsx` and `app/restaurant/[id]/error.tsx` error boundaries | New files | 2h |
| [x] | P1 | Add `app/not-found.tsx` for 404 handling | New file | 1h |
| [ ] | P2 | Upgrade from canary React to stable React 19 (deferred — see §10.1) | `package.json` | 30m |
| [x] | P2 | Clarify `isAdmin` role semantics — add explicit permission checks per action type | `lib/auth-context.tsx` | 3h |

### Phase 3 — Visual & UX Polish (Week 6–8)
*Design system fixes, dark mode, and interaction improvements*

| Done | Priority | Task | File(s) | Effort |
|------|----------|------|---------|--------|
| [x] | P1 | Replace hardcoded hex colors with CSS variables in `RestaurantGrid`, `PhotoCarousel`, `MapView` | 3 files | 3h |
| [x] | P1 | Replace image-mode cycling button with a 3-way segmented control | `FilterBar.tsx` | 3h |
| [x] | P1 | Show "Surprise Me" button even when filtered (pick random from filtered set) | `app/page.tsx` | 1h |
| [x] | P1 | Add proper chart labels, axes, and tooltips to stats bar chart | `app/admin/stats/page.tsx` | 4h |
| [x] | P2 | Make FilterBar collapse into a "Filters" sheet on mobile | `FilterBar.tsx` | 1d |
| [x] | P2 | Add section anchor navigation on restaurant detail page | `app/restaurant/[id]/` | 4h |
| [x] | P2 | Add skeleton loading state for map view and stats page | `MapView.tsx`, stats page | 2h |
| [x] | P2 | Fix `MapView` InfoWindow to use CSS variables (dark mode) | `MapView.tsx` | 1h |
| [x] | P3 | Add per-restaurant `opengraph-image.tsx` using Next.js `ImageResponse` | New file | 4h |
| [x] | P3 | Add JSON-LD `Restaurant` structured data to detail page | `app/restaurant/[id]/` | 3h |

### Phase 4 — Feature Additions (Week 9–14)
*New value-add features for public users and admins*

| Done | Priority | Feature | Notes | Effort |
|------|----------|---------|-------|--------|
| [ ] | P1 | **Occasions filter** in FilterBar | Field already exists on restaurant model | 4h |
| [ ] | P1 | **"Open Now" filter** | Uses `isCurrentlyOpen()` which already exists | 3h |
| [ ] | P1 | **Sort options** (rating, recently visited, recently added) | Client-side sort on existing data | 4h |
| [ ] | P1 | **PWA `manifest.json`** with full icon set and `theme-color` | New file + icons | 4h |
| [ ] | P2 | **Related restaurants section** on detail page ("More in [neighborhood]") | Query existing data | 4h |
| [ ] | P2 | **"Near Me" sort** using Geolocation API | Use existing `lat`/`lng` on Restaurant | 6h |
| [ ] | P2 | **Bulk admin operations** (visibility change, CSV export) | New admin UI | 1d |
| [ ] | P3 | **User wishlist / "Want to go"** | New Supabase table, RLS, UI | 2d |
| [ ] | P3 | **Server-side check-in rate limiting** via Supabase RLS policy | New SQL policy | 4h |

### Phase 5 — Dead Code Cleanup & Repo Hygiene (Week 15)
*Remove clutter, enforce standards*

| Done | Priority | Task | Effort |
|------|----------|------|--------|
| [ ] | P1 | Remove `getVisitRecency()` from `lib/utils.ts` | 15m |
| [ ] | P1 | Remove or redirect `app/admin/page.tsx` properly | 15m |
| [ ] | P1 | Remove `mustTryFilter` dead prop from `RestaurantGrid` Props type | 30m |
| [ ] | P1 | Move all SQL files to `supabase/migrations/` | 1h |
| [ ] | P1 | Move all planning `.md` files to `docs/` | 30m |
| [ ] | P1 | Verify and remove `AdminViewToggle.tsx` if orphaned | 30m |
| [ ] | P1 | Remove empty `graze/` directory | 5m |
| [ ] | P2 | Fix `isRestoring` state in `InfiniteCardGrid` to reset after restoration (`RestaurantGrid.tsx`) | 1h |
| [ ] | P3 | Add Vitest + Testing Library, write smoke tests for auth flow and home page | 2d |
| [ ] | P3 | Add Playwright e2e tests for check-in and restaurant detail flows | 2d |

---

## 8. Quick Win Summary

If you can only do 5 things before the next deploy, do these:

1. **Remove the 6 `console.log` calls** in `handleSave` — 30 minutes, zero risk.
2. **Fix the `/api/refresh-google-data` auth check** — it's broken for all non-cron callers.
3. **Fix the dead `isMobile ? "list" : "list"` ternary** — 5 minutes.
4. **Add `generateMetadata` to the restaurant detail route** — this alone unlocks social sharing previews and basic SEO.
5. **Replace `select("*")` on page_views in stats** with an aggregate RPC — this will eventually crash the page.

---

*Generated from full codebase review of `masontrang-dev/visit-sd`. All file paths are relative to repo root.*

---

## 9. Phase 1 Deferred / Follow-ups

Items intentionally punted during Phase 1 implementation. Revisit when appropriate.

### 9.1 Tighten CSP `img-src` allowlist

Phase 1 ships with `img-src 'self' data: blob: https:` — any HTTPS image host is allowed because restaurant photos come from arbitrary user-supplied URLs. Images can't execute code, so the security cost is low, but the ideal is an explicit allowlist.

**Follow-up**: audit all restaurant `photo_url` sources in production, enumerate the hosts that actually appear, and replace `https:` with that allowlist (e.g. `https://*.supabase.co https://*.googleusercontent.com https://images.unsplash.com …`).

### 9.2 Remove `'unsafe-inline'` / `'unsafe-eval'` from `script-src` and `style-src`

The current CSP uses `'unsafe-inline' 'unsafe-eval'` on `script-src` (for Next.js runtime) and `'unsafe-inline'` on `style-src` (for Tailwind + inline style attributes). This weakens the CSP significantly — a stored-XSS bug could inject a `<script>` tag and it would execute.

**Follow-up**: migrate to nonce-based CSP. Next.js supports this via `middleware.ts` injecting a per-request nonce and adding it to `<Script nonce={...}>` / generated `<style nonce={...}>` tags. Non-trivial — plan a half-day.

### 9.3 Rename `middleware.ts` → `proxy.ts` (Next 16 deprecation)

Next 16 emits a build warning: *"The 'middleware' file convention is deprecated. Please use 'proxy' instead."* The existing `middleware.ts` (Supabase SSR session refresh) still works, but the convention will be removed in a future major. Simple rename + adjust `export const config = {...}` if needed.

---

## 10. Phase 2 Deferred / Follow-ups

### 10.1 Upgrade from canary React to stable React 19

Deferred during Phase 2 because the stable channel caused an incompatibility with a package in the current dependency set. `package.json` still pins `react` / `react-dom` to `^19.3.0-canary-da9325b5-20260417`.

**Follow-up**: re-attempt the upgrade after identifying the conflicting package. Likely candidates are `@vis.gl/react-google-maps`, `embla-carousel-react`, `eslint-config-next` (14.2.5), or an internal `react/canary` type import (see `app/layout.tsx` — `<ViewTransition>` uses canary types). Narrow by bumping one at a time.

### 10.2 Automated tests (Vitest / Testing Library / Playwright)

Deferred per user request during Phase 2 execution. The original Phase 5 §P3 entries for Vitest smoke tests and Playwright e2e still apply:
- Smoke tests for auth flow, home page load, restaurant detail render
- E2E tests for check-in and order logging flows
- Add `npm test` script and wire into CI

**Why it matters**: Phase 2 introduces non-trivial refactors (server-component split, hook extraction, role-permission changes). Without tests, regressions in these flows are only caught in production.

### 10.3 Full split of the restaurant detail page

**Resolved.** Introduced `RestaurantDetailContext` and extracted `StickyHeader`, `RestaurantActionBar`, and `VisitHistorySection` into sibling files under `app/restaurant/[id]/`. Local `formatDate` / `formatTime` helpers moved to `formatters.ts` so the new components can share them. `RestaurantDetailClient.tsx` still holds the heavier sections (hero, curator take, recommended items, curator order history) and the modals — further decomposition is possible but no longer blocking.

---

## 11. Phase 3 Deferred / Follow-ups

### 11.1 FilterBar mobile "Filters" sheet

**Resolved.** Below `md` (768px), the existing three desktop rows are hidden (`hidden md:flex`) and replaced with a single `Filters (N)` chip plus a horizontally scrollable row of active-filter pills. Tapping the chip opens a bottom sheet with the full control set: view toggle, image-mode segmented control, Must-Try, visibility (admin), and cuisine/area/price chip groups, with a `Clear all` / `Show results (N)` footer. Sheet open-state is mirrored to the `#filters` URL hash via `pushState` / `replaceState`, so back/forward navigation restores it. Desktop (`md+`) keeps the original inline layout untouched.

Implementation notes for future work:

- **Animation**: two CSS keyframe pairs in `tailwind.config.js` (`sheet-in` / `sheet-out`, `backdrop-in` / `backdrop-out`) drive the slide + fade. The sheet stays mounted for 280ms after `sheetOpen` flips to false so the exit keyframes can play before unmount. All animation utilities are gated by `motion-safe:` so reduced-motion users get an instant show/hide.
- **Styling**: the sheet uses `rounded-t-[20px] overflow-hidden` with a soft ambient shadow and no top border. A drag-handle pill sits at the top for affordance, but the sheet is not yet draggable; swipe-to-dismiss would be a follow-up.
- **Backdrop stacking**: the backdrop and sheet are both `absolute` inside a `fixed inset-0` container — the backdrop covers the full viewport (`absolute inset-0`) so it sits *behind* the sheet, not above it. A previous attempt used `flex flex-col` with the backdrop as `flex-1` and the sheet stacked below; that caused the page's own `bg-bg` to leak through the rounded corner cutouts (white in light mode, black in dark mode). Layering the backdrop full-bleed fixes it; do not revert to the stacked layout.
- **Scroll-lock + ESC**: body overflow is locked while the sheet is open, and Escape closes it. Outside clicks on the backdrop also close.

### 11.2 Notes on Phase 3 implementation

A few notes worth preserving for future work in these areas:

- **Semantic tint tokens**: `--recency-bg` / `--recency-txt`, `--open-bg` / `--open-txt`, `--closed-bg` / `--closed-txt`, and `--pick-bg` / `--pick-txt` now live in `app/globals.css` with dark-mode variants, mapped into Tailwind via `tailwind.config.js`. Prefer these over hardcoded hex when adding new status badges or pills.
- **InfoWindow dark mode**: Google Maps' `InfoWindow` injects a fixed-white container into `.gm-style`. Rather than fight it per-marker, `app/globals.css` has a `.dark .gm-style .gm-style-iw-*` override that swaps the background to `var(--bg)` and the text to `var(--txt)` in dark mode, and content inside `MapView.tsx` now uses `text-txt` / `text-txt2` / `text-accent2` classes so the whole block themes together.
- **`SectionNav`**: a tab bar (`app/restaurant/[id]/SectionNav.tsx`) is rendered *inside* `StickyHeader` so the title row and the tabs slide in/out as one unit — rendering them as separate fixed-positioned elements caused the z-30 `StickyHeader` to cover the section nav when it expanded. It detects section presence by DOM id at mount time and uses an `IntersectionObserver` with `rootMargin: -148px 0px -60% 0px` to track the active section. Anchor IDs in use: `our-take`, `recommended-items`, `order-history`, `visit-history`. New sections should add an `id` to participate.
- **Stats `ViewsByDayChart`**: extracted into a local component with y-axis ticks, hover tooltips, peak highlighting, and summary stats (total / avg / peak). If usage grows, consider migrating to a charting lib (e.g. Recharts) rather than extending the inline SVG-less implementation.
