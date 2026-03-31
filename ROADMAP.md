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

## Step 14 — Smart Cuisine & Price Detection _(~45 min)_

- [x] Add `price_level` and `types` to Google Places Autocomplete fields
- [x] Auto-fill cuisine type from Google Place types (e.g. `mexican_restaurant` → `Mexican`)
- [x] Auto-fill price range from Google `price_level` (1–4 → $–$$$$)
- [x] Admin can edit auto-detected values after autofill
- [x] Replace plain cuisine text input with searchable combobox (type-to-filter + custom entry)
- [x] Combobox options merge existing DB cuisines with default list
- [x] Keyboard navigation (Arrow keys, Enter, Escape) for combobox

---

## Step 15 — Server-Side Admin Auth _(~1 hr)_

- [x] Create Route Handler at `app/api/auth/route.ts` for password check
- [x] Return HTTP-only cookie on success
- [x] Admin page reads cookie instead of checking `NEXT_PUBLIC_ADMIN_PASSWORD`
- [x] Remove `NEXT_PUBLIC_ADMIN_PASSWORD` env var (no longer in client bundle)

---

## Step 16 — Tailwind CSS Migration _(~2 hr)_

- [x] Install and configure Tailwind CSS
- [x] Migrate `globals.css` variables to Tailwind theme config
- [x] Replace inline `React.CSSProperties` in all components with Tailwind classes
- [x] Verify responsive behavior on mobile

---

## Step 17 — Dark Mode _(~30 min)_

- [x] Add dark color scheme to Tailwind config / CSS variables
- [x] Add toggle button (or auto-detect via `prefers-color-scheme`)
- [x] Test all components in both themes

---

## Environment Variables

```bash
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_PASSWORD=                      # server-only, removed from client in Step 15

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

## Step 18 — Visit Tracking System _(~2 hr)_

Track when restaurants are visited by admins, with full visit history.

**Database migration:**

```sql
CREATE TABLE restaurant_visits (
  id bigint generated always as identity primary key,
  restaurant_id bigint references restaurants(id) on delete cascade,
  visited_by text not null,
  visited_at timestamptz default now()
);

ALTER TABLE restaurant_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert" ON restaurant_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon read" ON restaurant_visits FOR SELECT USING (true);

ALTER TABLE restaurants
  ADD COLUMN date_added timestamptz default now(),
  ADD COLUMN last_visited timestamptz;
```

- [x] Run migration in Supabase SQL Editor
- [x] Add "Mark as Visited" button on restaurant cards (admin view only)
- [x] Log visit to `restaurant_visits` table with current user
- [x] Update `last_visited` timestamp on `restaurants` table
- [x] Display visit stats on cards: "Visited X times, last visited [date]"
- [x] Add expandable visit history section showing all visit dates
- [x] Show "Date Added" on restaurant cards

---

## Step 19 — Mobile-First View _(~1 hr)_

Default to mobile-optimized view for better phone experience.

- [x] Update `FilterBar.tsx` to default to List view on mobile devices
- [x] Add responsive detection (viewport width or user agent)
- [x] Optimize card layout for mobile screens (single column, larger touch targets)
- [x] Test map view on mobile devices
- [x] Ensure all admin controls are accessible on mobile

---

## Step 20 — Restaurant Detail Page _(~1.5 hr)_

Dedicated page for each restaurant with full details and visit history.

- [x] Create `app/restaurant/[id]/page.tsx` route
- [x] Display full restaurant info: photo, name, cuisine, price, address, description
- [x] Show complete visit history timeline
- [x] Add "View on Google Maps" button
- [x] Add "Mark as Visited" action (admin only)
- [x] Add "Edit" and "Delete" buttons (admin only)
- [x] Link restaurant cards to detail page
- [x] Add breadcrumb navigation back to main list

---

## Step 21 — User Authentication System _(~1 hr)_

Replace single admin password with user-specific authentication.

**Database migration:**

```sql
CREATE TABLE users (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read" ON users FOR SELECT USING (true);
```

- [x] Run migration in Supabase SQL Editor (see `MIGRATION_STEP_21.sql`)
- [x] Add password hashing utility (bcrypt)
- [x] Seed users table with Mason and Linli accounts (use `scripts/seed-users.ts`)
- [x] Update `app/api/auth/route.ts` to check username + password
- [x] Store username in session cookie
- [x] Auto-populate "Added by" field based on logged-in user
- [x] Remove "Added by" dropdown (auto-populated from logged-in user)
- [x] Update environment variables:
  ```bash
  # Removed ADMIN_PASSWORD
  # Removed NEXT_PUBLIC_ADMIN_NAMES
  # User credentials managed in Supabase users table
  ```

---

## Step 22 — User Analytics & Demographics _(~1 hr)_ ⚠️

Track user location and demographics for insights.

**Privacy considerations:**

- IP address logging (can identify general location)
- City/region detection via IP geolocation
- User agent tracking (device/browser info)
- No PII (personally identifiable information) stored
- Consider adding privacy policy page

**Database migration:**

```sql
ALTER TABLE page_views
  ADD COLUMN ip_address inet,
  ADD COLUMN country text,
  ADD COLUMN region text,
  ADD COLUMN device_type text;
```

- [ ] Evaluate privacy implications with users
- [ ] Add IP geolocation service (e.g., ipapi.co, MaxMind)
- [ ] Update page view logging to capture IP and location
- [ ] Parse user agent for device type (mobile/desktop/tablet)
- [ ] Add analytics dashboard showing:
  - Geographic distribution of visitors
  - Device type breakdown
  - Traffic sources
- [ ] Create privacy policy page explaining data collection
- [ ] Add opt-out mechanism or cookie consent banner

**Note:** Consider if this level of tracking is necessary for a personal restaurant guide. May be overkill for the use case.

---

## Step 23 — AI-Powered Restaurant Summaries _(~3 hr)_ 🔬

Feasibility study: Use AI to aggregate reviews and descriptions from Google Maps.

**Research phase:**

- [ ] Investigate Google Places API review access (requires Places API - Details)
- [ ] Check API costs: $17/1000 requests for Place Details
- [ ] Evaluate AI options:
  - OpenAI GPT-4 API (~$0.03 per summary)
  - Anthropic Claude API
  - Local LLM (Ollama) for cost savings
- [ ] Estimate total cost for 50-100 restaurants

**Implementation (if feasible):**

- [ ] Add `OPENAI_API_KEY` or similar to environment variables
- [ ] Create server-side API route for AI summary generation
- [ ] Fetch Google reviews via Places API (Place Details)
- [ ] Send reviews to AI with prompt: "Summarize these reviews in 2-3 sentences, highlighting what makes this restaurant special"
- [ ] Store generated summary in `restaurants.ai_summary` column
- [ ] Add "Generate AI Summary" button in admin edit modal
- [ ] Display AI summary on restaurant detail page
- [ ] Add refresh button to regenerate summaries

**Cost estimate:**

- Google Places Details: $17/1000 = $0.017 per restaurant
- OpenAI GPT-4: ~$0.03 per summary
- **Total: ~$0.05 per restaurant** (one-time cost)
- For 100 restaurants: ~$5 total

**Alternative approach:**

- Use free Google Places Basic Data (name, address, rating) + web scraping (check ToS)
- Use free tier of AI APIs (limited requests)
- Manual curation instead of AI

---

## Step 24 — Item Ordering, Reviews & Drink Customization _(~4 hr)_

Track individual dishes and drinks ordered at each restaurant with photos, ratings, and reviews. Boba/cafe shops get additional drink customization fields.

**Database migration:**

```sql
-- Add restaurant type
ALTER TABLE restaurants
  ADD COLUMN restaurant_type text default 'standard';

-- Menu items table
CREATE TABLE menu_items (
  id            bigint generated always as identity primary key,
  restaurant_id bigint references restaurants(id) on delete cascade,
  name          text not null,
  category      text,
  description   text,
  is_recommended boolean default false,
  created_at    timestamptz default now()
);

-- Item orders table
CREATE TABLE item_orders (
  id             bigint generated always as identity primary key,
  menu_item_id   bigint references menu_items(id) on delete cascade,
  restaurant_id  bigint references restaurants(id) on delete cascade,
  ordered_at     date default current_date,
  rating         int check (rating between 1 and 5),
  notes          text,
  photo_url      text,
  drink_details  jsonb,
  created_at     timestamptz default now()
);

-- RLS policies
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read menu_items"  ON menu_items  FOR SELECT USING (true);
CREATE POLICY "Anon insert menu_items"  ON menu_items  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update menu_items"  ON menu_items  FOR UPDATE USING (true);
CREATE POLICY "Anon delete menu_items"  ON menu_items  FOR DELETE USING (true);

CREATE POLICY "Public read item_orders" ON item_orders FOR SELECT USING (true);
CREATE POLICY "Anon insert item_orders" ON item_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update item_orders" ON item_orders FOR UPDATE USING (true);
CREATE POLICY "Anon delete item_orders" ON item_orders FOR DELETE USING (true);

-- Indexes
CREATE INDEX item_orders_restaurant_id_idx ON item_orders(restaurant_id);
CREATE INDEX item_orders_menu_item_id_idx  ON item_orders(menu_item_id);
CREATE INDEX item_orders_ordered_at_idx    ON item_orders(ordered_at desc);
CREATE INDEX menu_items_restaurant_id_idx  ON menu_items(restaurant_id);

-- Storage bucket for item photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true);

CREATE POLICY "Public read item-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-photos');

CREATE POLICY "Anon upload item-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-photos');

CREATE POLICY "Anon delete item-photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'item-photos');
```

**Implementation tasks:**

- [ ] Run database migration in Supabase SQL Editor
- [ ] Update `Restaurant` type in `lib/supabase.ts` with `restaurant_type` field
- [ ] Create `MenuItem` and `ItemOrder` types in `lib/supabase.ts`
- [ ] Add "Log an order" button on restaurant detail page (admin only)
- [ ] Create order logging modal with:
  - Menu item autocomplete (search existing or create new)
  - Category selector (food/drink/dessert/signature)
  - Photo upload to Supabase Storage
  - 1-5 star rating
  - Notes/review textarea
  - Date picker (defaults to today)
- [ ] Add restaurant type selector in restaurant add/edit modal
- [ ] Implement boba-specific fields (sweetness, ice, toppings, size, temperature):
  - Toggle between descriptive pills and percentage slider (0-100%, 5% increments)
  - Multi-select toppings with custom entry
  - Store as JSONB with normalized 0-100 values
- [ ] Implement cafe-specific fields (size, temperature, milk type, shots)
- [ ] Add "Menu highlights" section to restaurant detail page:
  - Show items marked `is_recommended: true`
  - Display average rating and order count
  - Show most recent photo and notes
- [ ] Create `/admin/boba` dashboard page with:
  - Summary stats (total check-ins, unique shops, unique drinks)
  - Per-shop breakdown (visits, most ordered drink, common customization)
  - Preference analysis (sweetness/ice distribution, top toppings)
  - "Haven't been in a while" nudges (3+ visits, 30+ days ago)
- [ ] Add "Usual order" card on boba shop pages (most frequent drink + customization)

**Reference:** See `item-ordering.md` for complete specification including:

- Sweetness/ice scale mappings (descriptive ↔ percentage)
- Default toppings list
- JSONB schema for `drink_details`
- Field availability by restaurant type
- Sample queries for aggregations

---

## Notes

- The "1 spot" / "2 spots" text next to cuisine headers is a count of restaurants in that group — not a bug.
- All steps are additive — nothing breaks the existing public/admin flow.
- Steps 1–3 have no external dependencies. Steps 4–7 require a Google Cloud API key. Steps 8–16 are independent of each other and can be done in any order.
- No third-party analytics needed — a single Supabase table replaces Google Analytics for this use case.
- **New features (Steps 18-24)** focus on visit tracking, mobile UX, user management, AI enhancements, and item-level ordering/reviews.
