# Additional Features — Design & Implementation Guide

**Feature version:** 1.0  
**Last updated:** 2026-03-30  
**Covers:** Ratings, Occasion Filters, Recency Badge, Open Now, PWA, Visit Heatmap, Full-Text Search, Surprise Me

---

## 1. Google Maps Rating + Admin Rating

### Overview

Each restaurant card surfaces two ratings side by side — the crowd-sourced Google Maps score and your personal admin rating. Visitors immediately see both the public consensus and your trusted opinion, which is the whole point of a curated guide over just using Google Maps directly.

### Data model

Add two columns to the `restaurants` table:

```sql
alter table restaurants
  add column if not exists google_rating      numeric(2,1),   -- e.g. 4.3
  add column if not exists google_rating_count int,           -- e.g. 1842
  add column if not exists admin_rating        int            -- 1–5, your personal score
    check (admin_rating between 1 and 5);
```

### Fetching the Google rating

When a restaurant is added via the Google Places autocomplete, fetch the rating in the same `getDetails` call by adding `rating` and `user_ratings_total` to the fields array:

```typescript
placesService.current.getDetails(
  { placeId: s.placeId, fields: ['name', 'address_components', 'types', 'rating', 'user_ratings_total'] },
  (place, status) => {
    if (place.rating)              setGoogleRating(place.rating)
    if (place.user_ratings_total)  setGoogleRatingCount(place.user_ratings_total)
  }
)
```

Save both values to the `restaurants` row on insert. Re-fetch and update periodically (weekly cron via Vercel) to keep the score fresh.

### Keeping Google ratings fresh

Google ratings change over time. A simple Vercel cron job (`/api/cron/refresh-ratings`) running weekly re-fetches the `rating` and `user_ratings_total` for every restaurant that has a `google_place_id` stored and updates the DB. Add `google_place_id text` as a column when inserting so you have the reference for future fetches.

```typescript
// vercel.json
{
  "crons": [{ "path": "/api/cron/refresh-ratings", "schedule": "0 9 * * 1" }]
}
```

### Card UI

Display both ratings as a compact inline pair on the card. Google's rating uses a filled star icon; your rating uses a distinct color (the app's accent orange) so they're never confused.

```
⭐ 4.3  (Google · 1,842)    🟠 5/5  (My pick)
```

Rules:
- If `admin_rating` is null, show only the Google rating — don't show an empty slot
- If `google_rating` is null (e.g. manually added restaurant), show only the admin rating
- Both present — show side by side with a thin divider between them
- On the individual restaurant page, expand to show the full Google review count and a note like "My rating is based on X visits"

### Admin UI

In the Add/Edit restaurant modal, add a 1–5 star tap-to-rate widget for the admin rating. This is separate from per-item ratings (which live in `item_orders`) and represents your overall feeling about the restaurant.

---

## 2. Occasion Filters

### Overview

Visitors don't browse restaurants by cuisine — they browse by situation. "Where should we go for date night?" is a completely different question than "where can I take my parents for a casual lunch?" Occasion tags answer that question directly on the filter bar.

### Data model

```sql
alter table restaurants
  add column if not exists occasions text[] default '{}';
-- stored as a Postgres array e.g. '{date_night,outdoor_patio,groups}'
```

Using a Postgres array (rather than a join table) keeps queries simple for a small dataset and avoids an extra table. If occasion filtering ever becomes complex enough to need full relational querying, migrate to a join table at that point.

### Default occasion tags

| Tag key | Display label |
|---|---|
| `date_night` | Date night |
| `casual_lunch` | Casual lunch |
| `groups` | Good for groups |
| `outdoor_patio` | Outdoor patio |
| `business_lunch` | Business lunch |
| `late_night` | Late night |
| `solo_dining` | Solo dining |
| `family_friendly` | Family friendly |
| `brunch` | Brunch |
| `happy_hour` | Happy hour |
| `celebrations` | Celebrations |
| `quick_bite` | Quick bite |

Admin can select multiple occasions per restaurant. No limit enforced — a spot can be both "date night" and "good for groups."

### Filter bar behavior

Occasion filters appear as a second row of pills below the cuisine filter row, or as a collapsible section to keep the toolbar compact on mobile. Filtering is additive within occasions (OR logic) — selecting "Date night" and "Outdoor patio" returns restaurants tagged with either. Combining a cuisine filter with an occasion filter is AND logic — "Italian + Date night" returns Italian restaurants also tagged as date night spots.

### Supabase query

```typescript
// cuisine + occasion combined filter
let query = supabase.from('restaurants').select('*')

if (cuisine !== 'all')   query = query.eq('cuisine', cuisine)
if (occasion !== 'all')  query = query.contains('occasions', [occasion])

const { data } = await query.order('name')
```

### Admin UI

Multi-select chip grid in the Add/Edit modal under a section labeled "Good for." Chips toggle on/off. Selected chips render filled, unselected render outlined.

---

## 3. Last Visited Recency Badge

### Overview

A small badge on each restaurant card showing how recently you checked in, built from your existing check-in data. This signals to visitors that your picks are current and actively maintained — "visited 4 days ago" is far more reassuring than a static list with no dates.

### Badge rules

| Last check-in | Badge | Color |
|---|---|---|
| Within 7 days | "This week" | Green |
| 8–14 days | "2 weeks ago" | Green (lighter) |
| 15–30 days | "This month" | Amber |
| 31+ days | No badge | — |

No badge outside the 30-day window keeps the UI clean and avoids surfacing stale timestamps. If a restaurant has never been checked into, no badge is shown.

### Data source

This pulls from the existing `check_ins` table (or wherever check-in timestamps are stored). The query joins the most recent check-in per restaurant:

```sql
select
  r.id,
  r.name,
  max(c.visited_at) as last_visited
from restaurants r
left join check_ins c on c.restaurant_id = r.id
group by r.id, r.name;
```

In the frontend, compute the badge client-side from the returned `last_visited` timestamp:

```typescript
function getRecencyBadge(lastVisited: string | null): { label: string; color: string } | null {
  if (!lastVisited) return null
  const days = Math.floor((Date.now() - new Date(lastVisited).getTime()) / 86400000)
  if (days <= 7)  return { label: 'This week',   color: 'green' }
  if (days <= 14) return { label: '2 weeks ago', color: 'green-light' }
  if (days <= 30) return { label: 'This month',  color: 'amber' }
  return null
}
```

### Card placement

The badge sits in the top-left corner of the card, above the cuisine label, as a small pill. It should never compete visually with the restaurant name — keep it 11px, lightweight, and use the semantic color variables already in the design system.

---

## 4. Open Now Indicator

### Overview

A live green dot on each card when a restaurant is currently open, pulled from Google Places hours data. This is the single most practical piece of information for a visitor deciding where to go right now.

### Data model

Store the place's opening hours locally to avoid hitting the Google API on every page load:

```sql
alter table restaurants
  add column if not exists google_place_id  text,
  add column if not exists opening_hours    jsonb,   -- Google's periods array
  add column if not exists hours_updated_at timestamptz;
```

The `opening_hours` column stores Google's native `periods` structure — an array of open/close times per day of the week. This is fetched once on restaurant creation and refreshed weekly by the same cron job that refreshes ratings.

### Fetching hours

Add `opening_hours` to the Places `getDetails` fields array:

```typescript
fields: ['name', 'address_components', 'types', 'rating', 'user_ratings_total', 'opening_hours', 'place_id']
```

Store `place.opening_hours.periods` to the `opening_hours` JSONB column and `place.place_id` to `google_place_id`.

### Computing "open now" client-side

Google's periods array contains UTC open/close times per day. Compute open status client-side using the visitor's local time — no additional API call needed after the initial fetch:

```typescript
function isOpenNow(periods: google.maps.places.PlaceOpeningHoursPeriod[]): boolean {
  const now   = new Date()
  const day   = now.getDay()      // 0 = Sunday
  const hhmm  = now.getHours() * 100 + now.getMinutes()

  return periods.some(p => {
    if (p.open.day !== day) return false
    const opens  = p.open.time  ? parseInt(p.open.time)  : 0
    const closes = p.close?.time ? parseInt(p.close.time) : 2400
    return hhmm >= opens && hhmm < closes
  })
}
```

### UI

A small dot indicator next to the neighborhood line on the card:

- 🟢 **Open now** — green dot, no text needed on the card; full "Open · Closes at 10pm" text on the individual restaurant page
- 🔴 **Closed** — only show on the individual restaurant page, not on cards (showing "Closed" on every card feels negative and clutters the grid)
- ⚫ **No hours data** — dot omitted entirely

On the individual restaurant page, show the full weekly hours table pulled from the stored `opening_hours` data with today's hours highlighted.

### Holiday hours caveat

Google's hours data does not reliably reflect holiday hours or temporary closures. Add a free-text `hours_note` column (`text`, nullable) so you can override with a manual note like "Closed Christmas week" or "Summer hours — kitchen closes at 9pm." Surface this note prominently on the restaurant page when present.

---

## 5. Mobile-First PWA

### Overview

Adding a `manifest.json` and service worker turns the app into an installable Progressive Web App. Visitors can add it to their iPhone or Android home screen and use it exactly like a native app — full screen, no browser chrome, with an app icon. Zero extra infrastructure, zero cost.

### Files to add

**`/public/manifest.json`**

```json
{
  "name": "EAT SD — San Diego Picks",
  "short_name": "EAT SD",
  "description": "Our go-to San Diego restaurants for visitors and friends",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF8",
  "theme_color": "#D85A30",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**`/public/sw.js`** — service worker with cache-first strategy for the shell, network-first for API calls:

```javascript
const CACHE = 'eatsd-v1'
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png']

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)))
)

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // Network-first for Supabase API calls
  if (url.hostname.includes('supabase.co')) return
  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  )
})
```

**Register in `app/layout.tsx`:**

```typescript
// Add to the <head> in layout.tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#D85A30" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="EAT SD" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />

// Register service worker in a useEffect in layout or a root client component
<script dangerouslySetInnerHTML={{ __html: `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
  }
`}} />
```

### Icons to generate

Create two PNG icons and place them in `/public/icons/`:

| File | Size | Usage |
|---|---|---|
| `icon-192.png` | 192×192px | Android home screen |
| `icon-512.png` | 512×512px | Android splash, iOS |

Use the existing "EAT SD" wordmark or a simple bold "E" on the accent orange background (`#D85A30`). Tools like [maskable.app](https://maskable.app) let you preview how the icon looks with Android's adaptive icon masking.

### iOS considerations

Safari on iOS does not fully support the Web App Manifest spec — the `apple-mobile-web-app-*` meta tags in the `<head>` handle the gaps. The `apple-touch-icon` link tells iOS what icon to use when a visitor taps "Add to Home Screen."

### Offline behavior

With the cache-first strategy above, the app shell (layout, fonts, icons) loads instantly from cache. Restaurant data requires a network connection since it comes from Supabase — on the offline state, show a friendly "You're offline — connect to load the latest spots" message rather than a blank screen.

---

## 6. Visit Heatmap & Stats Page (`/admin/stats`)

### Overview

A visual dashboard showing your dining patterns — most visited spots, favorite cuisines, check-in frequency over time, and boba-specific aggregations. Makes the check-in data feel meaningful rather than just a log.

### Sections

**Summary cards (top row)**

Four metric cards in a 2×2 grid:

- Total check-ins (all time)
- Unique restaurants visited
- Most visited restaurant (name + count)
- Favorite cuisine (by check-in count)

**Check-in frequency over time**

A bar chart showing check-ins per week or per month (toggleable). Built with Recharts, which is already available in the React artifact environment and works well in Next.js. X-axis is date, Y-axis is check-in count. Hovering a bar shows the restaurants visited that week.

```typescript
// Query: check-ins grouped by week
const { data } = await supabase.rpc('checkins_by_week')
// or client-side group if volume is low enough
```

**Most visited spots**

A ranked list of your top 10 restaurants by check-in count, with the last visited date and a small sparkline showing visit cadence. Clicking a row goes to the restaurant page.

**Cuisine breakdown**

A horizontal bar chart showing check-ins per cuisine. Instantly shows whether you're actually eating as diversely as you think you are.

**Boba-specific panel**

Pulled from the boba aggregation queries documented in `item-ordering.md`:

- Total boba check-ins this month vs. last month
- Shops visited this month
- Most ordered drink (all time)
- Sweetness preference distribution (small bar chart across the 5 sweetness levels)
- Ice preference distribution

**Heatmap calendar**

A GitHub-style contribution calendar where each cell is a day and the fill intensity represents number of check-ins that day. Built with a simple CSS grid — no library needed. 52 columns × 7 rows, colored using the green ramp from the design system (lighter = fewer visits, darker = more).

### Supabase queries

```sql
-- Check-ins per week (create as a Postgres function)
create or replace function checkins_by_week()
returns table(week date, count bigint) as $$
  select
    date_trunc('week', visited_at)::date as week,
    count(*) as count
  from check_ins
  group by week
  order by week;
$$ language sql;

-- Top restaurants by check-in count
select
  r.name,
  r.cuisine,
  r.neighborhood,
  count(*) as visits,
  max(c.visited_at) as last_visited
from check_ins c
join restaurants r on c.restaurant_id = r.id
group by r.id, r.name, r.cuisine, r.neighborhood
order by visits desc
limit 10;

-- Check-ins per cuisine
select
  r.cuisine,
  count(*) as visits
from check_ins c
join restaurants r on c.restaurant_id = r.id
group by r.cuisine
order by visits desc;
```

---

## 7. Full-Text Search

### Overview

A single search input that queries across restaurant names, neighborhoods, cuisine types, your personal notes, and menu item names simultaneously. No external service — Supabase's built-in Postgres full-text search handles it entirely.

### Data model

Add a generated tsvector column to `restaurants` that Postgres keeps up to date automatically:

```sql
alter table restaurants
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector('english',
        coalesce(name, '')        || ' ' ||
        coalesce(neighborhood, '') || ' ' ||
        coalesce(cuisine, '')     || ' ' ||
        coalesce(note, '')
      )
    ) stored;

create index if not exists restaurants_search_idx
  on restaurants using gin(search_vector);
```

For menu items, create a separate index and union the results:

```sql
alter table menu_items
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) stored;

create index if not exists menu_items_search_idx
  on menu_items using gin(search_vector);
```

### Query

```typescript
async function search(term: string) {
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*')
    .textSearch('search_vector', term, { type: 'websearch' })

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, restaurants(name, neighborhood)')
    .textSearch('search_vector', term, { type: 'websearch' })

  return { restaurants, menuItems }
}
```

`type: 'websearch'` uses Google-style query parsing — quotes for exact phrases, minus for exclusion, automatic stemming. So searching "fish taco" matches "fish tacos," and "italian -pizza" returns Italian restaurants that don't mention pizza in their notes.

### UI

A search input in the top toolbar, always visible. As the user types (debounced 300ms), results appear in two sections below — "Restaurants" and "Menu items" — each showing the matched field highlighted. Clearing the input returns to the normal filtered grid.

On mobile the search input is full-width and the filter pills collapse behind a "Filter" button to keep the toolbar clean.

### Result ranking

Postgres full-text search returns a `ts_rank` score you can order by. Boost restaurant name matches over note matches:

```sql
select
  *,
  ts_rank(
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', coalesce(note, '')), 'C'),
    websearch_to_tsquery('english', $1)
  ) as rank
from restaurants
where search_vector @@ websearch_to_tsquery('english', $1)
order by rank desc;
```

---

## 8. "Surprise Me" Button

### Overview

A button that picks a random restaurant from the current filtered set — useful for visitors who are overwhelmed by choice or just want a quick recommendation. The real power is combining it with filters: "Surprise me with a casual Mexican spot near North Park."

### UI placement

A **"Surprise me ✦"** button sits at the right end of the filter toolbar, distinct from the cuisine/occasion pills. On mobile it anchors to the bottom of the screen as a floating action button so it's always reachable.

Tapping it triggers a brief animation (the card "shuffles" or the result bounces in) and surfaces a single restaurant in a spotlight modal — larger card with the photo, your rating, the must-order items, and two actions: **"This one!"** (closes the modal, the visitor has their answer) and **"Try again"** (picks another random match).

### Logic

The randomization happens client-side from the already-loaded filtered list — no additional query needed:

```typescript
function surpriseMe(restaurants: Restaurant[]): Restaurant {
  const idx = Math.floor(Math.random() * restaurants.length)
  return restaurants[idx]
}
```

If the current filter returns zero results, the button is disabled with a tooltip "No spots match this filter — try broadening it."

### Filter awareness

The surprise pick always respects the active cuisine and occasion filters. So if the visitor has filtered to "Mexican" + "Casual lunch," the surprise pick is guaranteed to be a casual Mexican spot. This makes it genuinely useful rather than just random.

### "Send to friend" action

In the spotlight modal, a third action — **"Share this pick"** — copies a deep link to that restaurant's individual page to the clipboard. Lets a visitor instantly text the recommendation to whoever they're with.

---

## Implementation Order

These features are roughly ordered from lowest to highest implementation effort:

1. **Google Maps + Admin ratings** — two new columns, one UI change on the card. One afternoon.
2. **Recency badge** — pure frontend, reads from existing check-in data. A few hours.
3. **Occasion filters** — new column, filter bar update, admin multi-select. One day.
4. **Surprise Me** — entirely client-side logic, new modal. One afternoon.
5. **Full-text search** — Supabase migration + search UI. One day.
6. **Open Now indicator** — depends on storing `google_place_id` and `opening_hours` (done in step 1). One afternoon after that.
7. **Visit heatmap / stats page** — most visual work, several charts. Two to three days.
8. **PWA** — manifest, icons, service worker. One afternoon but requires generating icons first.

---

## Database Migration (all features combined)

```sql
-- Ratings
alter table restaurants
  add column if not exists google_rating        numeric(2,1),
  add column if not exists google_rating_count  int,
  add column if not exists admin_rating         int check (admin_rating between 1 and 5),
  add column if not exists google_place_id      text,
  add column if not exists opening_hours        jsonb,
  add column if not exists hours_updated_at     timestamptz,
  add column if not exists hours_note           text,
  add column if not exists occasions            text[] default '{}';

-- Full-text search vectors
alter table restaurants
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector('english',
        coalesce(name, '')         || ' ' ||
        coalesce(neighborhood, '')  || ' ' ||
        coalesce(cuisine, '')      || ' ' ||
        coalesce(note, '')
      )
    ) stored;

alter table menu_items
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector('english',
        coalesce(name, '') || ' ' || coalesce(description, ''))
    ) stored;

-- Indexes
create index if not exists restaurants_search_idx on restaurants using gin(search_vector);
create index if not exists menu_items_search_idx  on menu_items  using gin(search_vector);
create index if not exists restaurants_occasions_idx on restaurants using gin(occasions);

-- Weekly check-ins function (for stats page)
create or replace function checkins_by_week()
returns table(week date, count bigint) as $$
  select
    date_trunc('week', visited_at)::date as week,
    count(*) as count
  from check_ins
  group by week
  order by week;
$$ language sql;
```
