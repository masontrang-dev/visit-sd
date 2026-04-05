# API Layer & Data Access

## Overview

VISIT SD has a thin server-side API layer (two Next.js route handlers) and does most data access client-side via the Supabase JS SDK. External integrations include Google Maps/Places and ipapi.co for IP geolocation.

The key architectural choice: **components query and mutate Supabase directly**. API routes only exist where server-side execution is required (cookie management, IP extraction).

## Next.js API Routes

There are exactly two API route files, both under `app/api/`.

### `/api/auth` — `app/api/auth/route.ts`

Three HTTP methods, all handling session cookies:

| Method | Purpose | Details |
|--------|---------|---------|
| POST | Login | Accepts `{ username, password }`, verifies against `users` table with bcrypt, sets `admin_session` httpOnly cookie (7-day expiry) |
| GET | Check session | Reads cookie, returns `{ authed, username }` |
| DELETE | Logout | Clears cookie by setting maxAge to 0 |

Creates its own Supabase client instance (not the shared one from `lib/supabase.ts`) using the same public anon key. Cookie settings: `httpOnly`, `secure` in production, `sameSite: lax`, `path: /`.

See [authentication.md](authentication.md) for the full auth flow.

### `/api/log-view` — `app/api/log-view/route.ts`

POST-only. Logs page views for analytics.

1. Receives `{ path, referrer, user_agent }` from the client
2. Extracts visitor IP from `x-forwarded-for` or `x-real-ip` headers
3. Detects device type (mobile/tablet/desktop) from user-agent string via regex
4. Calls **ipapi.co** free tier (`https://ipapi.co/{ip}/json/`) for geolocation (city, region, country)
5. Inserts a row into the `page_views` table

Rate limit concern: ipapi.co free tier allows 1000 requests/day. If traffic exceeds that, geolocation silently fails (caught and logged, does not block the insert).

Called fire-and-forget from the homepage (`app/page.tsx`):

```ts
fetch("/api/log-view", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
  }),
}).catch(() => {});
```

## Client-Side Data Access (Supabase JS)

The shared Supabase client lives at `lib/supabase.ts`. It exports:
- `supabase` — the client instance (anon key, no service role)
- Type definitions: `Restaurant`, `RestaurantVisit`, `MenuItem`, `ItemOrder`, `DrinkDetails`, `PageView`

### Read Patterns

Components import `supabase` and query directly in `useEffect` callbacks. No data-fetching hooks or abstraction layer.

| Component / Page | Table(s) Queried | Notes |
|-----------------|-----------------|-------|
| `app/page.tsx` | `restaurants` | Public listing, ordered by cuisine then name |
| `app/admin/page.tsx` | `restaurants`, `restaurant_visits`, `page_views` | Admin dashboard, also calls `supabase.rpc("get_last_cleanup_run")` |
| `app/admin/boba/page.tsx` | `menu_items`, `restaurants`, `item_orders` | Filters menu_items by `category = 'boba'`, then loads related restaurants and orders |
| `app/restaurant/[id]/page.tsx` | `restaurants`, `restaurant_visits`, `menu_items`, `item_orders` | Detail page, loads all related data for one restaurant |

All reads use the anon key. Access control relies on Supabase RLS policies (see [data-model.md](data-model.md)).

### Mutation Patterns

Mutations also go through the client-side Supabase SDK. No API routes for CRUD.

**Restaurant CRUD** (`app/admin/page.tsx`):
- `handleAdd()` — `supabase.from("restaurants").insert([entry]).select()`
- `handleEdit()` — `supabase.from("restaurants").update(entry).eq("id", id)`
- Delete is in `components/AddModal.tsx` — `supabase.from("restaurants").delete().eq("id", id)`

**Visit logging** (`app/admin/page.tsx`, `app/restaurant/[id]/page.tsx`):
- Inserts into `restaurant_visits`, then updates `restaurants.last_visited` timestamp

**Order logging** (`components/OrderModal.tsx`):
- Inserts/upserts menu items into `menu_items`
- Inserts orders into `item_orders`

**Photo uploads** (Supabase Storage):
- `components/AddModal.tsx` — uploads to `restaurant-photos` bucket, compresses images to 500KB JPEG via `browser-image-compression`, deletes old photo on replace
- `components/OrderModal.tsx` — uploads to `item-photos` bucket at path `{restaurantId}/{menuItemId}/{timestamp}.jpg`

After mutations, components call their `loadData()` function to refetch (no optimistic updates).

### Supabase RPC

One RPC call exists: `supabase.rpc("get_last_cleanup_run")` in the admin dashboard. This queries a `cleanup_log` table to show when the last data-cleanup cron ran. The function is defined in `MIGRATION_STEP_22_CRON.sql`.

## External Service Integrations

### Google Maps / Places API

Two separate integration points using different libraries:

**1. Places Autocomplete** — `components/AddModal.tsx`
- Uses `@googlemaps/js-api-loader` (`setOptions`, `importLibrary`)
- Attaches `google.maps.places.Autocomplete` to a search input
- Restricted to US establishments
- Requested fields: `name`, `formatted_address`, `place_id`, `geometry`, `address_components`, `price_level`, `types`
- Auto-fills: restaurant name, address, place_id, lat/lng, neighborhood (from address components), cuisine (from Google place types via `GOOGLE_TYPE_TO_CUISINE` mapping), price range (from `price_level`)

**2. Map Display** — `components/MapView.tsx`
- Uses `@vis.gl/react-google-maps` (`APIProvider`, `Map`, `AdvancedMarker`, `InfoWindow`)
- Centers on San Diego (`32.7157, -117.1611`)
- Renders markers for restaurants that have lat/lng data
- Requires a Map ID (`visit-sd-map`) configured in Google Cloud Console
- Gracefully degrades: shows a message if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing

### ipapi.co

Used server-side only in `app/api/log-view/route.ts`. Free tier, no API key required. Sends a custom `User-Agent: visit-sd/1.0` header. Failure is non-blocking.

## Environment Variables

| Variable | Used By | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase.ts`, both API routes | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts`, both API routes | Client + Server |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `AddModal`, `MapView` | Client only |

No server-only secrets (no Supabase service role key in use). All Supabase access uses the anon key, relying on RLS for security.

## Architecture Notes

**No API abstraction layer.** Components call `supabase.from("table")` directly. This is simple and works for the project's scale, but means:
- Table names and query shapes are scattered across components
- No centralized error handling for data operations
- No request deduplication or caching beyond what the browser provides

**No server components for data fetching.** Everything is `"use client"`. Data loads happen in `useEffect` on mount. This means no SSR/SSG for restaurant data — the public page always fetches client-side on load.

**Three separate Supabase client instances.** `lib/supabase.ts` exports the shared one. Both API routes (`auth/route.ts` and `log-view/route.ts`) create their own instances with the same credentials. These are functionally identical but not shared.
