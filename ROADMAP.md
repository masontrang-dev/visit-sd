# VISIT SD — Implementation Plan

> A personal San Diego restaurant guide — simple enough for daily use, cool enough to share with visitors.

**Stack**: Next.js 14 (App Router) + Supabase Postgres, deployed on Vercel

---

## Step 1 — Database Migration _(5 min)_

Run once in Supabase SQL Editor. This adds all columns needed for every feature below.

```sql
ALTER TABLE restaurants
  ADD COLUMN added_by text,
  ADD COLUMN address text,
  ADD COLUMN google_maps_url text,
  ADD COLUMN place_id text,
  ADD COLUMN lat double precision,
  ADD COLUMN lng double precision,
  ADD COLUMN photo_url text,
  ADD COLUMN must_try boolean default false;

-- Allow updates from anon key (gated behind admin password in UI)
CREATE POLICY "Anon update" ON restaurants FOR UPDATE USING (true) WITH CHECK (true);
```

- [x] Run migration in Supabase SQL Editor
- [x] Update `Restaurant` type in `lib/supabase.ts` with new fields
- [x] Verify existing data still loads correctly

---

## Step 2 — "Added by" Dropdown _(~30 min)_

- [x] Add `NEXT_PUBLIC_ADMIN_NAMES=Mason,Friend` to `.env.local` and Vercel
- [x] Add a `<select>` dropdown in `AddModal.tsx` for choosing who added the restaurant
- [x] Save `added_by` to Supabase on insert
- [x] Display "Added by X" on each card in `RestaurantGrid.tsx`

---

## Step 3 — Code Cleanup & UX Polish _(~20 min)_

- [x] Delete unused `PRICE_OPTIONS` constant in `app/admin/page.tsx`
- [x] Disable Save button while insert is in-flight (prevent double-clicks)
- [x] Disable Delete button while delete is in-flight
- [x] Show inline success confirmation after adding a restaurant
- [x] Show error message if a Supabase call fails

---

## Step 4 — Google Cloud Setup _(~15 min, manual)_

- [x] Create a Google Cloud project (or use existing)
- [x] Enable **Places API**
- [x] Enable **Maps JavaScript API**
- [x] Create an API key → restrict to your domain(s) + only these 2 APIs
- [x] Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local` and Vercel
- [x] Set daily quota cap (e.g. 100 req/day) — see [Cost Management](#cost-management) below
- [x] Set billing budget alert at $1

---

## Step 5 — Places Autocomplete in Add Modal _(~1 hr)_

- [x] Install `@googlemaps/js-api-loader`
- [x] Add Places Autocomplete input to `AddModal.tsx`
- [x] On place selection, auto-fill: `name`, `neighborhood`, `address`, `google_maps_url`, `lat`, `lng`, `place_id`
- [x] Keep all fields manually editable after autofill
- [ ] Test with a few real San Diego restaurants

---

## Step 6 — Google Maps Link on Cards _(~15 min)_

- [x] Show address on each card in `RestaurantGrid.tsx`
- [x] Render clickable "View on Maps ↗" link using stored `google_maps_url`

---

## Step 7 — Interactive Map View _(~1 hr)_

- [x] Install `@vis.gl/react-google-maps`
- [x] Create `MapView.tsx` — Google Map with markers for each restaurant
- [x] Add info windows on marker click (name, cuisine, price)
- [x] Add **List / Map** toggle to `FilterBar.tsx`
- [x] Cuisine filters apply in map view too

---

## Step 8 — Edit Restaurants _(~45 min)_

- [x] Add "Edit" button on cards (admin view only)
- [x] Re-use `AddModal` in edit mode, pre-filled with existing data
- [x] Call Supabase `update` instead of `insert` when editing
- [x] Refresh list after successful edit

---

## Step 9 — Must-Try Badge _(~30 min)_

- [x] Add "Must-Try" toggle in `AddModal.tsx` (and edit mode)
- [x] Display a badge/star on flagged cards in `RestaurantGrid.tsx`
- [x] Add "Must-Try" filter option in `FilterBar.tsx`

---

## Step 10 — Shareable Filtered Links _(~20 min)_

- [x] Sync active filter to URL query params (e.g. `/?cuisine=Mexican`)
- [x] Read filter from URL on page load
- [x] Add "Copy link" button to filter bar

---

## Step 11 — Neighborhood Filter _(~20 min)_

- [x] Add second row of filter buttons for neighborhoods
- [x] Both filters (cuisine + neighborhood) can be active simultaneously
- [x] Include neighborhood in shareable URL params

---

## Step 12 — Photo Support _(~45 min)_

- [x] Add optional photo URL field in `AddModal.tsx`
- [x] Display photo as card header/thumbnail in `RestaurantGrid.tsx`
- [x] Graceful fallback when no photo is set

---

## Step 13 — Usage Analytics _(~1.5 hr)_

Create the `page_views` table in Supabase:

```sql
CREATE TABLE page_views (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  user_agent text,
  city text,
  created_at timestamptz default now()
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert" ON page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon read" ON page_views FOR SELECT USING (true);
```

- [ ] Run `page_views` migration in Supabase SQL Editor
- [x] Log a row on each public page load (fire-and-forget, non-blocking)
- [x] Build Admin → Stats section: total views, views per day, top referrers
- [x] Auto-delete rows older than 90 days (Supabase cron or app-level cleanup)

---

## Step 14 — Server-Side Admin Auth _(~1 hr)_

- [ ] Create Route Handler at `app/api/auth/route.ts` for password check
- [ ] Return HTTP-only cookie on success
- [ ] Admin page reads cookie instead of checking `NEXT_PUBLIC_ADMIN_PASSWORD`
- [ ] Remove `NEXT_PUBLIC_ADMIN_PASSWORD` env var (no longer in client bundle)

---

## Step 15 — Tailwind CSS Migration _(~2 hr)_

- [ ] Install and configure Tailwind CSS
- [ ] Migrate `globals.css` variables to Tailwind theme config
- [ ] Replace inline `React.CSSProperties` in all components with Tailwind classes
- [ ] Verify responsive behavior on mobile

---

## Step 16 — Dark Mode _(~30 min)_

- [ ] Add dark color scheme to Tailwind config / CSS variables
- [ ] Add toggle button (or auto-detect via `prefers-color-scheme`)
- [ ] Test all components in both themes

---

## Environment Variables

```bash
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ADMIN_PASSWORD=           # removed in Step 14

# Added in Step 2
NEXT_PUBLIC_ADMIN_NAMES=Mason,Friend  # comma-separated

# Added in Step 4
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

---

## Cost Management

> Configure at the **platform level** — not in app code. These are hard stops.

### Google Cloud

| Action                      | Where                                  | Setting                           |
| --------------------------- | -------------------------------------- | --------------------------------- |
| Billing budget alert        | Billing → Budgets & Alerts             | $1 budget, alerts at 50/90/100%   |
| Daily quota cap (hard stop) | APIs & Services → Places API → Quotas  | 100 requests/day                  |
| Daily quota cap (hard stop) | APIs & Services → Maps JS API → Quotas | 100 loads/day                     |
| Restrict API key            | Credentials → Edit key                 | Your domain(s) only + 2 APIs only |

**Free tier math**: $200/mo credit = ~11K autocomplete requests or ~28K map loads. Personal use will be a tiny fraction.

### Supabase

- **Free plan**: 500MB DB, 1GB storage, 5GB bandwidth, 50K MAU
- **No surprise charges**: project auto-pauses if limits are exceeded
- A restaurant list + analytics table uses <1% of limits

---

## Notes

- The "1 spot" / "2 spots" text next to cuisine headers is a count of restaurants in that group — not a bug.
- All steps are additive — nothing breaks the existing public/admin flow.
- Steps 1–3 have no external dependencies. Steps 4–7 require a Google Cloud API key. Steps 8–16 are independent of each other and can be done in any order.
- No third-party analytics needed — a single Supabase table replaces Google Analytics for this use case.
