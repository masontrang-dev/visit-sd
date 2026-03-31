# Item Ordering, Reviews & Drink Customization

**Feature version:** 1.0  
**Last updated:** 2026-03-30  
**Applies to:** All restaurant types — Standard, Cafe, Boba

---

## Overview

The item ordering system lets the admin log individual dishes and drinks ordered at any restaurant, attach photos, write reviews, and rate each item. For cafes and boba shops, additional drink customization fields are available — including sweetness level, ice level, size, temperature, and toppings.

All orders are stored historically so you can track how frequently you visit, how your ratings change over time, and what your go-to orders are at each spot. Boba shop visits are aggregated into a dedicated dashboard.

---

## Data Model

Three tables power this feature:

```
restaurants
  └── menu_items         ← the dish or drink itself
        └── item_orders  ← each time you ordered it
```

### `restaurants` (updated)

A new `restaurant_type` column determines which fields appear in the order logging UI.

| Column | Type | Values |
|---|---|---|
| `restaurant_type` | `text` | `standard`, `cafe`, `boba` |

### `menu_items`

Represents a specific dish or drink at a restaurant. One row per item — if you order the same Fish Taco six times, there is one `menu_items` row and six `item_orders` rows.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | Primary key |
| `restaurant_id` | `bigint` | Foreign key → restaurants |
| `name` | `text` | e.g. "Taro Milk Tea", "Fish Taco" |
| `category` | `text` | `food`, `drink`, `dessert`, `signature` |
| `description` | `text` | Optional description |
| `is_recommended` | `boolean` | Pinned as a highlight on the public page |
| `created_at` | `timestamptz` | Auto-set |

### `item_orders`

One row per ordering event. Stores your photo, rating, notes, date, and drink-specific customization details.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | Primary key |
| `menu_item_id` | `bigint` | Foreign key → menu_items |
| `restaurant_id` | `bigint` | Denormalized for easier querying |
| `ordered_at` | `date` | Defaults to today |
| `rating` | `int` | 1–5, nullable |
| `notes` | `text` | Your review / impressions |
| `photo_url` | `text` | Supabase Storage public URL |
| `drink_details` | `jsonb` | Boba/cafe customization — see below |
| `created_at` | `timestamptz` | Auto-set |

---

## Drink Details Schema (JSONB)

The `drink_details` column uses a flexible JSONB structure. Both sweetness and ice store a normalized 0–100 integer value regardless of whether the user entered it as a descriptor or a percentage — this is what powers aggregation and comparisons across orders.

```json
{
  "sweetness": {
    "style": "descriptive",
    "value": 75,
    "label": "Less sweet"
  },
  "ice": {
    "style": "percentage",
    "value": 40,
    "label": "40%"
  },
  "size": "large",
  "temperature": "iced",
  "toppings": ["Tapioca pearls", "Grass jelly"],
  "milk_type": null,
  "shots": null
}
```

`style` records how the user entered the value (`descriptive` or `percentage`) so the UI can render it back correctly when viewing past orders. Both styles map to the same normalized `value` so you can compare "Less sweet" and "75%" as the same thing in aggregations.

---

## Sweetness Scale

The following descriptors map to normalized percentage values. The percentage slider snaps in **5% increments** and supports any value from 0–100.

| Descriptor | Normalized value |
|---|---|
| No sugar | 0% |
| 25% | 25% |
| Half sweet | 50% |
| Less sweet | 75% |
| Full sweet | 100% |

The toggle between descriptive and percentage mode resets each session. Switching modes does not change the stored value — only the display style.

---

## Ice Scale

| Descriptor | Normalized value |
|---|---|
| No ice | 0% |
| Light ice | 25% |
| Less ice | 40% |
| Regular | 50% |
| Extra ice | 100% |

Same toggle behavior as sweetness — resets each session, percentage slider snaps to 5% increments.

---

## Default Toppings

The following toppings are available as quick-select chips. Additional custom toppings can be typed in and added on the fly.

- Tapioca pearls (boba)
- Popping boba
- Grass jelly
- Pudding
- Lychee jelly
- Aloe vera
- Red bean
- Cheese foam
- *(+ custom entry)*

---

## Restaurant Types & Field Availability

| Field | Standard | Cafe | Boba |
|---|---|---|---|
| Item name | ✓ | ✓ | ✓ |
| Category | ✓ | ✓ | ✓ |
| Photo | ✓ | ✓ | ✓ |
| Rating (1–5) | ✓ | ✓ | ✓ |
| Notes / review | ✓ | ✓ | ✓ |
| Date ordered | ✓ | ✓ | ✓ |
| Sweetness | — | — | ✓ |
| Ice level | — | — | ✓ |
| Toppings | — | — | ✓ |
| Size | — | ✓ | ✓ |
| Temperature | — | ✓ | ✓ |
| Milk type | — | ✓ | — |
| Shots (espresso) | — | ✓ | — |

---

## Admin UI Flow

### Logging an order

1. Navigate to any restaurant page in the admin view
2. Click **"Log an order"**
3. **Select or create a menu item** — autocomplete searches existing items at that restaurant; typing a new name and confirming creates it automatically
4. Fill in the fields relevant to the restaurant type (see table above)
5. Optionally upload a photo — stored in Supabase Storage, public URL saved to `photo_url`
6. Set a 1–5 star rating and add notes
7. Confirm the date (defaults to today, editable)
8. Click **Save** — the order is logged immediately

### Boba-specific flow

After selecting or creating the drink item:

1. **Sweetness** — toggle between descriptor pills (No sugar / 25% / Half sweet / Less sweet / Full sweet) and a percentage slider (0–100%, 5% increments)
2. **Ice** — same toggle between descriptor pills and percentage slider
3. **Size** — Small / Medium / Large / Extra Large
4. **Temperature** — Hot / Warm / Iced
5. **Toppings** — multi-select chips from the default list, plus a free-text input to add custom toppings not on the list
6. Photo, rating, notes, and date as normal

### Cafe-specific flow

After selecting or creating the drink item:

1. **Size** — Small / Medium / Large
2. **Temperature** — Hot / Iced
3. **Milk type** — Whole / Oat / Almond / Soy / Coconut / None
4. **Shots** — number input (1, 2, 3, 4+)
5. Photo, rating, notes, and date as normal

---

## Public Visitor View

On each restaurant's public page, the item ordering data surfaces as follows:

### All restaurant types

- **Menu highlights** section below the restaurant header
- Each highlighted item (`is_recommended: true`) shows the item photo, name, your average rating across all orders, and how many times you've ordered it
- A small **"ordered X times"** badge signals what you genuinely love vs. what you tried once
- Clicking an item expands your most recent notes and photo

### Boba shops

- A **"Usual order"** card at the top of the menu section showing your most frequently ordered drink with your most common customization (sweetness, ice, toppings) — e.g. "Taro Milk Tea · Less sweet · Less ice · Tapioca pearls + Grass jelly"
- Individual drink cards show your average rating and order count

### Standard restaurants

- Top-rated dishes shown as photo cards with your rating and a short pull-quote from your notes
- Ordered by rating descending, then by order count

---

## Boba Aggregation Dashboard (`/admin/boba`)

A dedicated admin page aggregating data across all boba-type restaurants.

### Summary stats

- Total boba check-ins (all time, this month, this year)
- Number of unique boba shops visited
- Number of unique drinks tried
- Favorite shop by visit count

### Per-shop breakdown

Each boba shop shows:

- Total visits and last visited date
- Most ordered drink with average rating
- Your most common customization at that shop
- A mini timeline of recent visits

### Preference analysis

Across all boba orders:

- Most common sweetness level (by normalized value and by label)
- Most common ice level
- Top 3 most ordered toppings
- Sweetness distribution chart — shows how your preference spreads across all orders
- Hot vs. iced breakdown

### "Haven't been in a while" nudges

Boba shops you visited 3+ times in the past but haven't checked into in 30+ days surface as a gentle reminder section at the bottom of the dashboard.

---

## Supabase Migration

Run the following SQL in the Supabase SQL Editor. The full migration file is also included in the project as `supabase-migration.sql`.

```sql
-- Add restaurant type to existing table
alter table restaurants
  add column if not exists restaurant_type text default 'standard';

-- Menu items
create table if not exists menu_items (
  id            bigint generated always as identity primary key,
  restaurant_id bigint references restaurants(id) on delete cascade,
  name          text not null,
  category      text,
  description   text,
  is_recommended boolean default false,
  created_at    timestamptz default now()
);

-- Item orders
create table if not exists item_orders (
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

-- RLS
alter table menu_items enable row level security;
alter table item_orders enable row level security;

create policy "Public read menu_items"  on menu_items  for select using (true);
create policy "Anon insert menu_items"  on menu_items  for insert with check (true);
create policy "Anon update menu_items"  on menu_items  for update using (true);
create policy "Anon delete menu_items"  on menu_items  for delete using (true);

create policy "Public read item_orders" on item_orders for select using (true);
create policy "Anon insert item_orders" on item_orders for insert with check (true);
create policy "Anon update item_orders" on item_orders for update using (true);
create policy "Anon delete item_orders" on item_orders for delete using (true);

-- Indexes
create index if not exists item_orders_restaurant_id_idx on item_orders(restaurant_id);
create index if not exists item_orders_menu_item_id_idx  on item_orders(menu_item_id);
create index if not exists item_orders_ordered_at_idx    on item_orders(ordered_at desc);
create index if not exists menu_items_restaurant_id_idx  on menu_items(restaurant_id);
```

---

## Supabase Storage Setup

Photos are stored in a dedicated Supabase Storage bucket. Run the following once in the SQL Editor:

```sql
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true);

create policy "Public read item-photos"
  on storage.objects for select
  using (bucket_id = 'item-photos');

create policy "Anon upload item-photos"
  on storage.objects for insert
  with check (bucket_id = 'item-photos');

create policy "Anon delete item-photos"
  on storage.objects for delete
  using (bucket_id = 'item-photos');
```

Photos are uploaded to a path of `{restaurant_id}/{menu_item_id}/{timestamp}.jpg` and the resulting public URL is stored in `item_orders.photo_url`.

---

## Key Queries

### Most ordered drink at a boba shop

```sql
select
  mi.name,
  count(*) as order_count,
  round(avg(io.rating), 1) as avg_rating
from item_orders io
join menu_items mi on io.menu_item_id = mi.id
join restaurants r on io.restaurant_id = r.id
where r.restaurant_type = 'boba'
  and io.restaurant_id = :restaurant_id
group by mi.name
order by order_count desc
limit 1;
```

### Boba check-ins this month

```sql
select
  r.name,
  count(*) as visits
from item_orders io
join restaurants r on io.restaurant_id = r.id
where r.restaurant_type = 'boba'
  and io.ordered_at >= date_trunc('month', current_date)
group by r.name
order by visits desc;
```

### Most common sweetness preference (normalized)

```sql
select
  round(avg((drink_details->'sweetness'->>'value')::int)) as avg_sweetness
from item_orders
where drink_details->'sweetness' is not null;
```

### Shops not visited in 30+ days (with 3+ prior visits)

```sql
select
  r.name,
  max(io.ordered_at) as last_visit,
  count(*) as total_visits
from item_orders io
join restaurants r on io.restaurant_id = r.id
where r.restaurant_type = 'boba'
group by r.name
having
  max(io.ordered_at) < current_date - interval '30 days'
  and count(*) >= 3
order by last_visit asc;
```

---

## Future Enhancements

- **Per-shop sweetness label customization** — some shops define "less sweet" as 30%, others as 50%. Allow overriding the default descriptor-to-percentage mapping per restaurant.
- **Order comparison view** — side-by-side view of two orders of the same drink to see how customization or rating changed between visits.
- **"My usual" quick-log** — one-tap logging that pre-fills your most common customization at a shop, just confirm the date and save.
- **Seasonal item tagging** — mark items as seasonal so the public view can surface "ask about the strawberry matcha, it's back" style alerts.
- **Export order history** — download a CSV of all item orders for a restaurant or across all boba shops.
