# Data Model

Supabase (hosted Postgres) is the sole data store. All types are defined in `lib/supabase.ts`. Schema migrations live as standalone SQL files at the repo root (not managed by a migration tool).

## Tables

### restaurants

The core entity. Every other table either references it or is independent.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint (identity) | PK |
| name | text | required |
| neighborhood | text | San Diego neighborhood |
| cuisine | text | e.g. "Mexican", "Boba Tea" |
| price | text | "$", "$$", "$$$", "$$$$" |
| note | text | free-form recommendation note |
| added_by | text | nullable, admin username |
| address | text | nullable |
| google_maps_url | text | nullable |
| place_id | text | Google Places ID, nullable |
| lat, lng | float | nullable, for map view |
| photo_url | text | public URL from Supabase Storage |
| must_try | boolean | highlight flag |
| date_added | text | nullable, display date |
| last_visited | text | nullable, updated on visit logging |
| created_at | timestamptz | auto |

**Key behavior**: `last_visited` is denormalized -- it's updated manually when a visit is logged (see `app/restaurant/[id]/page.tsx` `handleMarkVisited`), not derived from `restaurant_visits`. This avoids an extra join on the main listing page.

### restaurant_visits

Tracks each time an admin marks a restaurant as visited.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint (identity) | PK |
| restaurant_id | bigint | FK to restaurants (logical, see note below) |
| visited_by | text | admin username |
| visited_at | timestamptz | auto, defaults to now |

Displayed as a visit history list on the restaurant detail page.

### menu_items

Menu items belong to a restaurant. Used for boba ordering and general item tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint (identity) | PK |
| restaurant_id | bigint | FK to restaurants, ON DELETE CASCADE |
| name | text | required |
| category | text | nullable, e.g. "boba" -- used to filter boba dashboard |
| description | text | nullable |
| is_recommended | boolean | default false |
| created_at | timestamptz | auto |

**Category convention**: The boba dashboard (`app/admin/boba/page.tsx`) filters on `category = 'boba'` to find boba-related items across all restaurants.

### item_orders

Individual order records for menu items. Supports photo uploads and boba-specific customization via `drink_details`.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint (identity) | PK |
| menu_item_id | bigint | FK to menu_items, ON DELETE CASCADE |
| restaurant_id | bigint | FK to restaurants, ON DELETE CASCADE (denormalized for query convenience) |
| ordered_at | date | default current_date |
| rating | int | 1-5, CHECK constraint |
| notes | text | nullable |
| photo_url | text | nullable, URL from `item-photos` storage bucket |
| drink_details | jsonb | nullable, boba customization (see below) |
| created_at | timestamptz | auto |

**Indexes**: `restaurant_id`, `menu_item_id`, `ordered_at DESC`

**drink_details JSON shape** (typed as `DrinkDetails` in `lib/supabase.ts`):

```ts
{
  sweetness?: { style: "descriptive" | "percentage", value: number, label: string },
  ice?:       { style: "descriptive" | "percentage", value: number, label: string },
  size?: string,
  temperature?: string,
  toppings?: string[],
  milk_type?: string,
  shots?: number
}
```

This is only populated for boba tea orders. The boba dashboard aggregates these fields for preference charts.

### users

Auth-only table. Not typed in `lib/supabase.ts` -- only accessed in `app/api/auth/route.ts`.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint (identity) | PK |
| username | text | unique, not null |
| password_hash | text | bcrypt hash |
| created_at | timestamptz | auto |

Seeded via `scripts/seed-users.ts`. See [authentication.md](authentication.md) for the auth flow.

### page_views

Analytics table. Inserted by the `/api/log-view` server route (not client-side) which enriches entries with IP geolocation.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint (identity) | PK |
| path | text | page path |
| referrer | text | nullable |
| user_agent | text | nullable |
| ip_address | inet | nullable |
| country | text | nullable, from ipapi.co lookup |
| region | text | nullable |
| city | text | nullable |
| device_type | text | "mobile", "tablet", "desktop" |
| created_at | timestamptz | auto |

**Retention**: A `pg_cron` job runs daily at 3 AM UTC to delete rows older than 90 days (see `MIGRATION_STEP_22_CRON.sql`). Cleanup results are logged to the `cleanup_log` table.

### cleanup_log

Tracks automated page_views cleanup runs.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint (identity) | PK |
| executed_at | timestamptz | auto |
| rows_deleted | int | count of purged page_views |

Queried via the `get_last_cleanup_run()` RPC function from the admin dashboard.

## Relationships

```
restaurants ──< restaurant_visits    (restaurant_id)
restaurants ──< menu_items           (restaurant_id, CASCADE)
menu_items  ──< item_orders          (menu_item_id, CASCADE)
restaurants ──< item_orders          (restaurant_id, CASCADE, denormalized)
```

Foreign keys with `ON DELETE CASCADE` exist on `menu_items` and `item_orders` (defined in `MIGRATION_STEP_24.sql`). The `restaurant_visits` table references `restaurant_id` logically but the FK constraint status is unclear from the migration files -- the original migration predates the SQL files in the repo.

The `users`, `page_views`, and `cleanup_log` tables are standalone with no foreign keys.

## Supabase Storage Buckets

| Bucket | Public | Used by |
|--------|--------|---------|
| `restaurant-photos` | yes | `components/AddModal.tsx` -- restaurant cover photos |
| `item-photos` | yes | `components/OrderModal.tsx` -- order/item photos |

Both buckets have RLS policies allowing public read and anon upload/delete.

## Row-Level Security

RLS is enabled on all tables. The policy pattern is consistent:

- **All tables**: public SELECT (anyone can read)
- **restaurants, menu_items, item_orders**: anon INSERT, UPDATE, DELETE (full write access via anon key)
- **users**: anon SELECT and INSERT only
- **page_views, cleanup_log**: anon INSERT (page_views) / SELECT only (cleanup_log)

**Security model**: Write operations are not gated at the database level. Instead, the admin UI is protected by cookie-based auth (see [authentication.md](authentication.md)), and all write operations happen through the admin interface. The anon Supabase key has full write access -- this is a deliberate tradeoff for a personal/small-audience app.

## RPC Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `cleanup_old_page_views()` | void | Deletes page_views older than 90 days, logs to cleanup_log. Called by pg_cron. |
| `get_last_cleanup_run()` | TABLE(executed_at, rows_deleted) | Returns most recent cleanup_log entry. Called from admin dashboard. |

## Query Patterns

Data fetching is done client-side via `@supabase/supabase-js`. There are no server components that fetch data -- all pages are `"use client"`. Typical patterns:

- **Listing page** (`app/page.tsx`): fetches all restaurants in one query, filters/sorts client-side
- **Detail page** (`app/restaurant/[id]/page.tsx`): parallel fetches for restaurant, visits, menu_items, and item_orders by restaurant_id
- **Boba dashboard** (`app/admin/boba/page.tsx`): fetches menu_items where `category = 'boba'`, then fetches related restaurants and orders by collected IDs -- manual client-side join
- **Analytics** (`app/admin/page.tsx`): fetches page_views and aggregates client-side

No Supabase joins or `.select('*, table(*)') ` syntax is used anywhere. All relationships are resolved by separate queries with `.eq()` or `.in()` filters.

## Migration History

Migrations are ad-hoc SQL files at the repo root, applied manually via Supabase SQL Editor:

| File | What it does |
|------|-------------|
| `MIGRATION_STEP_21.sql` | Creates `users` table |
| `MIGRATION_STEP_22.sql` | Adds geo/device columns to `page_views` |
| `MIGRATION_STEP_22_CRON.sql` | Sets up pg_cron cleanup job, `cleanup_log` table, RPC functions |
| `MIGRATION_STEP_23.sql` | Adds `photo_url` to restaurants |
| `MIGRATION_STEP_24.sql` | Creates `menu_items`, `item_orders`, `item-photos` bucket |
| `MIGRATION_STEP_24_REVERT_TYPE.sql` | Drops `restaurant_type` column (added then removed in step 24) |
| `FIX_PHOTO_URL_LENGTH.sql` | Changes restaurants.photo_url from varchar(100) to text |
| `FIX_RLS_POLICIES.sql` | Adds UPDATE policy to restaurants |
| `DEBUG_PHOTO_URL.sql` | Diagnostic queries (not a migration) |

Earlier migrations (steps 1-20) are not in the repo. The `restaurants`, `restaurant_visits`, and `page_views` base tables were created in those earlier steps.
