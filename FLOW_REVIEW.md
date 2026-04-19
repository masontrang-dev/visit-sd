# User Flow Review — Check-in, Orders & Ratings

**Status:** proposal / discussion  
**Last updated:** 2026-04-18  
**Scope:** Restaurant check-in, order logging, rating surfaces, and a new "private/not-recommended" restaurant concept.

---

## 1. Purpose of this doc

Visit SD is two products wearing the same skin:

1. **A curated public guide** — the admin/curators publish restaurants, dishes, and opinions for out-of-town visitors.
2. **A private dining journal for the curators** — track what you ate, when, what you liked, and what you never want to repeat.

The current flows mostly serve (1) well but are cluttered by (2) bleeding into public-facing surfaces. This doc reviews where the two purposes collide, proposes simplifications, and sketches a few new flows that make the journal side work more fluidly.

---

## 2. Current state

### 2.1 Roles

Roles live in `user_roles` and are read in `lib/auth-context.tsx`:

| Role        | Can do                                          |
| ----------- | ----------------------------------------------- |
| `superuser` | Everything + manage other users' roles          |
| `admin`     | Everything except role management               |
| `curator`   | Treated as admin in the UI (`isAdmin === true`) |
| `user`      | Sign in, browse, check in, rate their own visit |

In code, `isAdmin` collapses `admin | superuser | curator` into one boolean. There is no separation between "curator" and "admin" today — they are functionally identical.

### 2.2 Check-in flow (`components/CheckInModal.tsx`)

Entry point: "Check In" button fixed at bottom of the restaurant detail page.

1. User clicks **Check In**.
2. Modal opens with:
   - Date/time picker (defaults to now)
   - Optional rating (1–5 stars) — behind an "+ Add rating/notes" expander
   - Optional free-text note
3. On confirm, a row is inserted into `restaurant_visits` with `rating` and `note`.
4. `restaurants.last_visited` is updated (denormalized).

Quirks today:

- **Regular users** are throttled to one check-in per 24 hours (`hasRecentCheckIn` in `app/restaurant/[id]/page.tsx:93–102`).
- **Admins** are not throttled. Their check-in button turns into **Log Order** after a recent check-in, so the same button does two different things depending on state.
- The modal accepts a `shouldLogOrder` argument that would chain into OrderModal — but no button in the current UI passes `true` for it. Dead code path.

### 2.3 Order-logging flow (`components/OrderModal.tsx`)

Entry points:

- "+ Log Order" button in the admin-only "Full order history" section on the detail page.
- Repurposed "Check In" button when an admin has checked in within 24h.

Flow:

1. Admin types a menu item name (autocomplete over existing `menu_items` for that restaurant, or "Create …" if new).
2. Picks category (`food | drink | dessert | boba`).
3. Rating, date, optional photo, free-text notes.
4. If category is `drink` or `boba`, extra customization fields: sweetness, ice, toppings, size, temperature, milk type, espresso shots.
5. Save → creates a `menu_items` row if new + an `item_orders` row.

Pain point the user flagged: **every order is a full manual entry**. Even when it's literally the same boba drink with the same customization as last Tuesday, the admin re-enters every field. The "Usual Order" card on the detail page is read-only — it displays, it does not log.

### 2.4 Rating surfaces today

There are **four** places a rating can live, and they are not meaningfully differentiated in the UI:

| Surface                | Table / column                         | Set by                          | Displayed where                                                               |
| ---------------------- | -------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Restaurant "My rating" | `restaurants.my_rating`                | Admin (in AddModal)             | Big number on detail page, top bar ("My rating", e.g. "4/5")                  |
| Rating history         | `rating_history` (full row with notes) | Admin, when `my_rating` changes | Not surfaced in UI today                                                      |
| Per-visit rating       | `restaurant_visits.rating` + `.note`   | Anyone checking in              | Visit history list on detail page                                             |
| Per-order rating       | `item_orders.rating`                   | Admin                           | Menu-item-tried cards, full order history, averaged into `avgRating` per item |

This is the central complaint: **curator's "my rating", public check-in ratings, and dish-level ratings all show up on the same page without clear hierarchy.** A visitor seeing "My rating 4/5" next to "Check-in: ★★★" from a random user has no way to tell whose opinion is whose.

### 2.5 Visibility

There is no "hidden" or "not recommended" state on a restaurant. Every row in `restaurants` appears on the public home page. `must_try` is the only flag that affects display, and it's a highlight, not a gate. A prior `restaurant_type` column was added in `MIGRATION_STEP_24.sql` and then reverted in `MIGRATION_STEP_24_REVERT_TYPE.sql` — that slot is free.

---

## 3. What's wrong (and what's fine)

### 3.1 Problems

1. **Rating sprawl.** Three independent rating fields show on one page with no hierarchy. Public visitors can't tell the curator's verdict apart from a stranger's drive-by rating. Admins don't have a clear mental model of which one to update after a visit.
2. **Visit ratings duplicate order ratings.** In practice the admin knows how they felt after eating something specific, not after "visiting the building." Per-visit rating is a weaker signal than per-item rating.
3. **`my_rating` is manual and stale.** It's a separate form field in AddModal. The curator has to remember to go back and edit the restaurant after enough visits to shift their opinion. `rating_history` exists but is never shown.
4. **Order logging is all-manual.** No reuse, no prefill, no "same as last time." The data model supports it (orders are historical) but the UI doesn't exploit it.
5. **Regular users can leave a rating on a check-in, and it shows on the public page.** That's fine for engagement but dilutes the curator brand the product is built around.
6. **All restaurants are public.** No way for an admin to log a place they tried and disliked without it appearing as a recommendation.

### 3.2 What is working

- The separation of `menu_items` (the thing) from `item_orders` (each time you had it) is the right shape — keep it.
- `drink_details` JSONB is flexible and the boba dashboard leverages it well.
- The check-in → order chain is almost wired up; just needs one button to finish it.
- Google Places autocomplete + `opening_hours` populate nicely. No changes needed there.

---

## 4. Proposed simplification (decisions applied)

### 4.1 One rating per scope, simpler signals

| Scope              | Proposed field                                                    | Who writes it          | Where it shows publicly                                                |
| ------------------ | ----------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| **Per-dish**       | `item_orders.liked` — **thumbs up / thumbs down**                 | Curator only           | Menu highlights, "Usual order" (sorted by like count)                  |
| **Per-restaurant** | `curator_ratings` — **one 1–5 rating per curator per restaurant** | Each curator, manually | "Curator's rating" (average) + each curator's individual rating listed |
| **Per-check-in**   | _removed entirely_                                                | —                      | Not shown; column dropped from `restaurant_visits`                     |

**Details:**

- **Curator rating stays manual**, not derived. Each curator sets their own 1–5 rating on a restaurant via the detail page or AddModal. The headline "Curator's rating" is the average across curators, rounded to the nearest 0.5. Under it, list each curator's individual rating with their name/avatar (e.g. `Mason ★★★★☆  ·  Alex ★★★★★`). This supports the multi-curator future without collapsing everyone into one voice.
- **Per-dish becomes a simple thumbs up / down.** The 1–5 star rating on `item_orders` is replaced with a binary `liked boolean` (nullable — the curator can log without a verdict). In aggregates we count ↑ vs. ↓ instead of averaging stars. Simpler to enter, simpler to read.
- **Remove `restaurant_visits.rating` entirely.** Drop the column, drop all UI that reads it. Regular users' check-ins become "a timestamp + an optional note" — no rating. This closes the rating-sprawl problem cleanly.
- **Drop `rating_history`.** Not surfaced anywhere; redundant with the new multi-curator model. Drop the table (or just stop writing to it in AddModal and leave the table for later cleanup).

### 4.2 Distinguish curator vs. community signals visually

On the public detail page, adopt this hierarchy:

1. **Google rating** — outside signal (as today).
2. **Curators' rating** — average across curators, shown big. Below it: each curator's individual rating + avatar.
3. **Check-ins count** — social proof, just a number with a timeline ("12 check-ins, last visited 3 days ago"). No per-check-in ratings shown. Notes from check-ins surface in the "Visit history" accordion as community colour.

### 4.3 Simplify the CheckInModal for everyone

The modal collapses to **one tap**:

- Confirm / edit the date (defaults to now).
- Optional one-line note.
- **No rating field, regardless of role.** Curators rate restaurants via the AddModal / detail-page controls and rate dishes via the OrderModal thumbs.

### 4.4 Rework the order / menu-item sections on the detail page

Today the detail page has three overlapping sections, and once stars become thumbs the current logic (sort by average rating) falls apart:

| Section                    | Source                                                              | Visible to | Shows                                                  |
| -------------------------- | ------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| Usual Order                | `itemsWithOrders[0]` if any `menu_items.category='boba'`            | Everyone   | Top boba drink for boba shops only                     |
| Menu items I've tried      | `is_recommended` items, falling back to **all** items with ≥1 order | Everyone   | Aggregate per dish (name, avg rating, ordered X times) |
| Full order history (Admin) | Every `item_orders` row, flat chronological                         | Curator    | Per-order cards with photo, rating, drink details      |

Problems:

- **"Menu items I've tried" leaks the curator's history to the public** when there are no recommended items yet — visitors see every random dish the curator tried once. That's fine for a journal but not for a guide.
- **"Usual order" and "Menu items I've tried" overlap**: for boba shops, the top of the second section IS the usual order. Duplicated surface.
- **"Full order history" is flat and chronological**, which makes it useful for recency but useless for "show me every time I ordered the Taro Milk Tea side by side."
- **Sort-by-average-rating breaks** the moment `item_orders.rating` becomes `liked boolean`. We need a new ordering signal anyway.

**Proposal: three sections collapse into two, split by audience.**

#### Public (everyone) — one section: "What to order here"

Merges the current "Usual Order" and the public-facing role of "Menu items I've tried".

Content rules:

- **Primary tiles:** only `menu_items.is_recommended = true`, sorted by `liked_count desc`, then `order_count desc`. Photo-first cards, short curator note pullquote, thumb summary (`👍 10 · 👎 1` or `👍 always`).
- **Usual-order callout (boba only):** if the most-ordered item at this restaurant has ≥3 orders AND is >50% of all boba orders there, pin it as a "Usual order" badge on that tile — even if it isn't flagged recommended. This preserves the signal the current Usual Order card gives without a second section.
- **No fallback to non-recommended items for the public.** If the curator hasn't recommended anything yet, the section just doesn't render. The restaurant's curator note + ratings already exist above; we don't need to pad it with random history.
- Each tile links to an expanded "history of this dish" view (see below) that is public-read but curator-edit.

#### Curator only — one section: "My history here"

Replaces the current "Full order history (Admin)" block. Default view is **by dish** (groups), with a toggle to flip to **by date** (timeline).

```
┌─ My history here ──────── [By dish] | [Timeline] ──┐
│                                                     │
│  Taro Milk Tea                      [★ Recommended] │
│  👍 10 · 👎 1 · no verdict 1 · 12 orders             │
│  Latest: "Best balance of sweet and taro" · 3d ago  │
│  ▼ 12 orders                                        │
│                                                     │
│  Jasmine Green Tea                 [☆ Recommend]    │
│  👍 2 · 👎 0 · 2 orders                              │
│  ▼ 2 orders                                         │
└─────────────────────────────────────────────────────┘
```

Rules:

- Group `item_orders` by `menu_item_id`. Each group is one expandable row.
- Group header shows dish name, thumb breakdown, order count, latest note, and the recommend-toggle button (which already exists on each item).
- Expanding shows the individual orders, one card per order: date, photo, thumb, notes, drink details. Edit/delete actions live here (as today).
- Default sort: by `order_count desc` so the curator's most-used dishes float up. Secondary sort by latest order date.
- **Timeline toggle**: flat chronological list of `item_orders`, like the current "Full order history" but with thumbs instead of stars. Useful for "what did I order last week across everything".

This has one consequence worth flagging: the public `is_recommended` toggle moves to the curator section (it's inside the per-dish group header there). Curators stop seeing the inline star button on the public tiles above, since editing recommended state happens in the curator section below. That's fine — separating "publish" controls from "journal" controls was the whole point.

#### Why this is better

- **Information scent matches audience.** Visitors see a small, recommended, curated list. Curators see their complete history, grouped the way their brain thinks about it ("how do I feel about this dish" rather than "what did I do on a given date").
- **One surface per concept.** "Usual order" is a badge, not a section. "History" is one section with two views instead of two sections with overlapping content.
- **Works under thumbs.** No rating averages to compute. Like/dislike counts are a natural group-level summary.
- **Scales with the journal feature.** Phase 4's `/admin/journal` can reuse the by-date timeline component.

### 4.5 Curator attribution on everything curator-authored

Today's schema loses authorship almost everywhere. Let's audit where attribution exists and where it's missing, because with multiple curators, "who said so" is part of the signal.

| Curator-authored thing      | Column / table today                                      | Attribution?                                                                                                        |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Restaurant rating           | `restaurants.my_rating` (single)                          | ❌ — one value for the whole app. **Fixed by Phase 1** via the new `curator_ratings(user_id)` table.                |
| Restaurant note ("my take") | `restaurants.note`                                        | ❌ — one note for the whole app.                                                                                    |
| Must-try flag               | `restaurants.must_try`                                    | ❌ — one bool.                                                                                                      |
| Dish recommendation         | `menu_items.is_recommended`                               | ❌ — one bool per dish.                                                                                             |
| Dish thumb (👍 / 👎)        | `item_orders.liked` (after Phase 1)                       | ❌ — `item_orders` has no `user_id` / `ordered_by` column. Two curators ordering the same dish can't be told apart. |
| Check-in                    | `restaurant_visits.visited_by` (text, from `displayName`) | ⚠️ text string, not an FK — works today, fragile if display names change.                                           |
| Restaurant added            | `restaurants.added_by` (text)                             | ⚠️ same fragility.                                                                                                  |

**Answer to the question:** after Phase 1 as written, we'd see per-curator attribution on restaurant-level ratings, but not on recommendations or on dish-level thumbs. That's incomplete. Two fixes are needed.

#### Fix 1 — Per-curator dish recommendations

Replace `menu_items.is_recommended boolean` with a join table. Each curator decides for themselves whether they recommend a dish.

```sql
create table if not exists menu_item_recommendations (
  id            bigint generated always as identity primary key,
  menu_item_id  bigint not null references menu_items(id) on delete cascade,
  user_id       uuid   not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (menu_item_id, user_id)
);
```

`menu_items.is_recommended` is backfilled into rows for the bootstrap superuser, then the column is dropped:

```sql
insert into menu_item_recommendations (menu_item_id, user_id)
select id, '<SUPERUSER_UUID>'::uuid from menu_items where is_recommended = true;

alter table menu_items drop column is_recommended;
```

**Display consequences:**

- On a public "What to order here" tile: small avatar stack of curators who recommended it, e.g. `Recommended by Mason + Alex`. Click the stack to see who.
- A dish shows in the public section if **≥1 curator recommends it** (same behavior as today, just attributed).
- In the curator "My history here" section, the per-dish header's recommend-toggle becomes a "Recommend (you)" toggle, writing a row for the current curator only. You can see "also recommended by" inline.
- Sort order in the public section: recommendations by **multiple** curators bubble to the top. `count(recommenders) desc`, then like count, then order count.

#### Fix 2 — Add `ordered_by` to `item_orders`

Simple column, no new table:

```sql
alter table item_orders add column if not exists ordered_by uuid references auth.users(id);

-- Backfill to the bootstrap superuser; re-attribute later by editing rows directly.
update item_orders set ordered_by = '<SUPERUSER_UUID>'::uuid where ordered_by is null;

alter table item_orders alter column ordered_by set not null;
```

The OrderModal sets `ordered_by = user.id` on insert. "Log again" (Phase 2) carries the **current** curator's id, not the source order's — if Alex clicks "Log again" on Mason's past order, the new row is attributed to Alex.

**Display consequences:**

- Per-dish thumb breakdown in "My history here" shows attribution when curators disagree:
  ```
  Taro Milk Tea
  👍 Mason (10) · 👎 Alex (1) · 12 orders
  ```
  When they agree, just the totals: `👍 12`.
- Public "What to order here" tile can optionally surface disagreement as colour: a dish that's 👍 from one curator and 👎 from another shows a small "Split opinion" chip. This is genuinely useful signal — more honest than averaging it away.
- Individual order cards in the expanded dish view show "by Mason, 3d ago" under each entry.

#### Optional fix 3 — Per-curator notes and must-try

If we care enough to finish the job, `restaurants.note` and `restaurants.must_try` should also become per-curator. The migration pattern is identical:

```sql
create table if not exists restaurant_curator_notes (
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  user_id       uuid   not null references auth.users(id)  on delete cascade,
  note          text,
  must_try      boolean not null default false,
  updated_at    timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
```

On the detail page's "Curators' take" section, render one block per curator with a name/avatar header. On the home page card, show a "must-try" chip coloured per curator (small avatar inside the chip) if any curator has flagged it.

This is polish and may not need to land in Phase 1 — I'd hold it for a Phase 1b unless you want to do the whole migration at once.

#### Summary of attribution decisions

| Surface                    | Phase 1 attribution                           | UI display                                                                              |
| -------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Restaurant rating          | Per-curator (new `curator_ratings`)           | Aggregate average + individual rows below                                               |
| Dish recommendation        | Per-curator (new `menu_item_recommendations`) | Avatar stack on public tile; recommendation toggle in curator view writes for self only |
| Dish thumb (👍/👎)         | Per-curator (new `item_orders.ordered_by`)    | Named breakdown when curators disagree; combined totals when they agree                 |
| Check-in                   | `visited_by` text (unchanged)                 | "by Mason" (as today)                                                                   |
| Restaurant note / must-try | (Phase 1b, optional) Per-curator table        | Named blocks in "Curators' take"; per-curator chip                                      |

### 4.4 Unify the bottom action button

Today the "Check In" button changes to "Log Order" for admins with a recent check-in. Split it into two persistent buttons when admin:

```
[ Check in ]  [ Log order ]     ← admin view
[ Check in ]                    ← signed-in user view
[ View on Maps ] [ Share ]      ← everyone (unchanged)
```

No state-dependent labels. Clearer mental model.

---

## 5. New flow: "Log my usual" / reuse past order

The admin has already ordered the Taro Milk Tea at Cha Su twelve times, each a version of the same drink. Logging #13 shouldn't require touching seven sliders.

### 5.1 UX

Add a **"Log my usual"** entry point to OrderModal, visible when there are ≥1 prior orders for that restaurant.

Top of the OrderModal, before the item autocomplete:

```
┌─ Your past orders at Cha Su ─────────────────────┐
│                                                   │
│  🥤 Taro Milk Tea · Less sweet · Less ice         │
│      + Tapioca pearls · Large                     │
│      ★ 4.5 avg · ordered 12 times · last 3d ago   │
│      [ Log again ] [ Adjust & log ]               │
│                                                   │
│  🧋 Jasmine Green Tea · Half sweet · Regular ice  │
│      ★ 4 · ordered 2 times · last 2mo ago         │
│      [ Log again ] [ Adjust & log ]               │
│                                                   │
│  [ Or log a brand new item ↓ ]                    │
└───────────────────────────────────────────────────┘
```

Two actions per past order:

- **Log again** — inserts a new `item_orders` row with the exact same `drink_details`, `menu_item_id`, today's date, the same rating and notes from the most recent order. One-tap.
- **Adjust & log** — prefills the OrderModal form with the most recent order's values and scrolls to the fields, so the admin can tweak sweetness or rating before saving.

Grouping: group `item_orders` by `menu_item_id`, show the most recent customization for each, sorted by recency. Show the top 3–5; put the rest behind a "More past orders" expander.

### 5.2 Data

No schema change required. Everything we need is already in `menu_items` + `item_orders`. A "log again" is literally:

```sql
insert into item_orders (menu_item_id, restaurant_id, ordered_at, rating, notes, drink_details)
select menu_item_id, restaurant_id, current_date, rating, notes, drink_details
from item_orders
where id = :source_order_id;
```

(The photo is _not_ carried over — photos should be per-visit.)

### 5.3 Where it fits

- From the detail page's "Usual Order" card (boba shops), a **"Log this again"** button becomes the primary action.
- Inside the OrderModal, the list above appears as the top section when prior orders exist.
- From the chained check-in flow (§5.4), we go straight to this list rather than the blank form.

### 5.4 Chain check-in → log order

Finish wiring up the dead code path. CheckInModal for admins gets a second primary action:

```
[ Check in & log order → ]
[ Check in ]
[ Cancel ]
```

"Check in & log order" fires the check-in insert, then immediately opens the OrderModal in "past orders" mode with the list from §5.1 visible. This matches how the curator actually uses the app — they sit down, check in, then log what they ordered.

---

## 6. New concept: private / not-recommended restaurants

### 6.1 Why

The curator wants to keep a complete dining journal, including places they tried and didn't like. Today the only choice is "add it and recommend it" or "don't add it." That's why so much of the admin's dining history is missing from the app — including it would lie to visitors.

### 6.2 Proposed model

Add a `visibility` column to `restaurants`:

| Value      | Meaning                                                                               | Who sees it |
| ---------- | ------------------------------------------------------------------------------------- | ----------- |
| `public`   | Curated, recommended, part of the guide. **Default.**                                 | Everyone    |
| `private`  | The curator went there but isn't recommending it. In their journal, not in the guide. | Admins only |
| `archived` | Used to recommend, no longer do. Kept for order history integrity.                    | Admins only |

```sql
alter table restaurants
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private', 'archived'));
```

(I'd avoid reusing the reverted `restaurant_type` name since that column had a different meaning and was removed specifically to avoid schema confusion.)

### 6.3 Where this shows up

- **Public home page (`app/page.tsx`)** — filter to `visibility = 'public'`.
- **Restaurant detail page** — private / archived restaurants return 404 for non-admins, render normally for admins with a clear banner:

  ```
  ┌─────────────────────────────────────────────────────┐
  │ 🔒 Private — not shown in the public guide          │
  └─────────────────────────────────────────────────────┘
  ```

- **Admin view** — a filter toggle in `FilterBar` (admin only): "Public / Private / Archived / All". Default is "Public" so the admin sees the same view as visitors.
- **AddModal** — a visibility selector at the top of the form. Default to `public`; switching to `private` greys out the "Must-Try" toggle and the rating UI (since there's nothing to recommend).
- **SurpriseBar / "Surprise me" / any random-pick surface** — filter to `visibility = 'public'`. Private/archived restaurants never get suggested.

### 6.4 What doesn't change

- The data model for `menu_items`, `item_orders`, `restaurant_visits` is unchanged.
- Admins can still log orders at private restaurants — that's the whole point. The order history on the boba dashboard should include private restaurants (the curator's preferences include drinks they ordered at places they didn't love).
- SEO / sitemap / structured data should only emit `public` restaurants.

---

## 7. Implementation plan

Each phase is independently shippable. Each ships with an SQL migration file at the repo root (`MIGRATION_FLOW_*.sql`) matching the existing convention.

---

### Phase 1 — Rating simplification & check-in cleanup

**Goal:** one rating per scope; no per-visit stars anywhere.

**Schema (`MIGRATION_FLOW_1_RATINGS.sql`):**

```sql
-- 1. Multi-curator ratings (replaces restaurants.my_rating as the source of truth)
create table if not exists curator_ratings (
  id             bigint generated always as identity primary key,
  restaurant_id  bigint not null references restaurants(id) on delete cascade,
  user_id        uuid   not null references auth.users(id)  on delete cascade,
  rating         int    not null check (rating between 1 and 5),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, user_id)
);
create index curator_ratings_restaurant_idx on curator_ratings(restaurant_id);

alter table curator_ratings enable row level security;
create policy "Public read curator_ratings" on curator_ratings for select using (true);
create policy "Anon write curator_ratings"  on curator_ratings for all using (true) with check (true);
-- (writes are UI-gated to curators, matching existing app convention)

-- 2. Backfill from restaurants.my_rating (attributed to the original curator if possible)
--    We don't know who set each my_rating today, so attribute to the current superuser as a
--    one-time bootstrap. Adjust the user_id below before running.
insert into curator_ratings (restaurant_id, user_id, rating, note)
select id, '<SUPERUSER_UUID>'::uuid, my_rating, null
from restaurants
where my_rating is not null
on conflict do nothing;

-- 3. Thumbs up/down on orders — replaces item_orders.rating
alter table item_orders add column if not exists liked boolean;

update item_orders
set liked = case when rating >= 4 then true
                  when rating <= 2 then false
                  else null end
where rating is not null;

alter table item_orders drop column rating;

-- 4. Attribution: who ordered each item
alter table item_orders add column if not exists ordered_by uuid references auth.users(id);
update item_orders set ordered_by = '<SUPERUSER_UUID>'::uuid where ordered_by is null;
alter table item_orders alter column ordered_by set not null;
create index if not exists item_orders_ordered_by_idx on item_orders(ordered_by);

-- 5. Per-curator dish recommendations (replaces menu_items.is_recommended)
create table if not exists menu_item_recommendations (
  id            bigint generated always as identity primary key,
  menu_item_id  bigint not null references menu_items(id) on delete cascade,
  user_id       uuid   not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (menu_item_id, user_id)
);
create index if not exists menu_item_recs_menu_item_idx on menu_item_recommendations(menu_item_id);

alter table menu_item_recommendations enable row level security;
create policy "Public read menu_item_recs" on menu_item_recommendations for select using (true);
create policy "Anon write menu_item_recs"  on menu_item_recommendations for all using (true) with check (true);

insert into menu_item_recommendations (menu_item_id, user_id)
select id, '<SUPERUSER_UUID>'::uuid from menu_items where is_recommended = true
on conflict do nothing;

alter table menu_items drop column is_recommended;

-- 6. Drop the per-visit rating
alter table restaurant_visits drop column if exists rating;

-- 7. Drop rating_history (no longer used)
drop table if exists rating_history;

-- 8. restaurants.my_rating stays for now as a cached avg (optional). Leaving it nullable and
--    non-authoritative — populated by an app-side update after each curator_ratings write.
--    If you want to drop it entirely later, that's a second migration.
```

**Type / code changes:**

| File                                          | Change                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/supabase.ts`                             | Add `CuratorRating` + `MenuItemRecommendation` types. Change `ItemOrder.rating` → `liked: boolean \| null`; add `ItemOrder.ordered_by: string`. Remove `is_recommended` from `MenuItem`. Remove `rating` from `RestaurantVisit` — keep `note` only. Remove `RatingHistory`.                                                                                                                  |
| `components/CheckInModal.tsx`                 | Remove rating stars and `showRating` toggle. Keep date/time + note only. Remove `rating` from `onConfirm` signature.                                                                                                                                                                                                                                                                         |
| `app/restaurant/[id]/page.tsx`                | `handleCheckIn`: drop `rating` arg. Visit history: stop rendering star row (lines ~988–1008). "My rating" column in the 3-stat header: replace with a new component reading `curator_ratings` for this restaurant — show avg on top, then a per-curator list. Relabel → **Curators' rating**.                                                                                                |
| `components/AddModal.tsx`                     | Remove the `my_rating` + `ratingNotes` UI block and the `rating_history` insert. Replaced by a separate `CuratorRatingControl` rendered on the detail page (next phase of the same PR).                                                                                                                                                                                                      |
| New `components/CuratorRatingControl.tsx`     | Shows the current user's rating if they're a curator; lets them set/change it. Writes to `curator_ratings` (upsert on `(restaurant_id, user_id)`).                                                                                                                                                                                                                                           |
| `components/OrderModal.tsx`                   | Replace the 5-star `rating` picker with two buttons: `👍 Liked` / `👎 Didn't like` / (unset). Field name → `liked`. Set `ordered_by: user.id` on every insert.                                                                                                                                                                                                                               |
| New `components/MenuItemRecommendToggle.tsx`  | Per-curator recommend toggle. Writes to `menu_item_recommendations` (upsert / delete for current user). Shows inline "also recommended by Alex" when others have recommended it. Rendered in the curator "My history here" per-dish group header.                                                                                                                                            |
| `app/restaurant/[id]/page.tsx` display rework | Replace the three current sections with two (see §4.4). Public: new **"What to order here"** section — `is_recommended` tiles only, sorted by `liked_count desc` then `order_count desc`, with a "Usual order" badge on the dominant boba drink when the signal is strong (≥3 orders, >50% of boba-category orders at that shop). Curator: new **"My history here"** section with `[By dish] | [Timeline]`toggle; default is by-dish grouping, expanding a dish reveals per-order cards (edit/delete live here). Move the`is_recommended` toggle out of the public tiles and into the per-dish group header in the curator section. |
| `app/admin/boba/page.tsx`                     | Anywhere it reads `item_orders.rating`, switch to `liked` and rework the aggregate (e.g. "% liked" instead of "avg rating").                                                                                                                                                                                                                                                                 |

**UI copy:**

- Everywhere the word "Admin" appears in user-facing strings relating to ratings/orders, swap to "Curator" / "Curators". `isAdmin` stays as the internal flag — only the copy changes.

**Acceptance:**

- A curator can set their 1–5 rating on a restaurant; a second curator can set a different one; the detail page shows the average big and both individuals below.
- Non-curator users see a check-in button that opens a one-field modal (date + note).
- Item orders show thumbs, not stars. "Usual order" still surfaces the right drink — now as a badge on a tile in "What to order here", not a standalone card.
- The public detail page shows only `is_recommended` tiles (plus the usual-order badge where applicable), never the full history.
- Curators see one consolidated "My history here" section with by-dish grouping and a timeline toggle.
- `restaurant_visits.rating` and `rating_history` are gone from the schema.

---

### Phase 2 — "Log my usual" / past-order reuse

**Goal:** one-tap logging of a repeat order, and wire up check-in → log order.

**Schema:** none.

**Code changes:**

| File                           | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/OrderModal.tsx`    | Add a new top section when `itemOrders.length > 0` at this restaurant: list the most recent order per menu item (grouped by `menu_item_id`, sorted by recency, top 5 with an expander for the rest). Each row: item name, customization summary, like/count stats, and two buttons: **Log again** (insert immediately; closes modal on success with toast) and **Adjust & log** (prefill the form below with this order's fields and scroll to item name). |
| `components/OrderModal.tsx`    | Accept a new optional `prefillFromOrder?: ItemOrder` prop so the detail page can push a specific past order in.                                                                                                                                                                                                                                                                                                                                            |
| `app/restaurant/[id]/page.tsx` | "Usual Order" card (boba): add a primary **Log this again** button that calls `handleLogAgain(usualOrder.latestOrder)` → inserts a cloned row and reloads.                                                                                                                                                                                                                                                                                                 |
| `app/restaurant/[id]/page.tsx` | Bottom action bar: split into two persistent buttons for admins: `[ Check in ]` and `[ Log order ]`. Drop the state-dependent label switch.                                                                                                                                                                                                                                                                                                                |
| `components/CheckInModal.tsx`  | For curators, add a second primary button: **Check in & log order →**. Calls `onConfirm({ logOrder: true })`.                                                                                                                                                                                                                                                                                                                                              |
| `app/restaurant/[id]/page.tsx` | `handleCheckIn` branch on `shouldLogOrder` to immediately open OrderModal after the check-in insert succeeds (the plumbing exists; just needs the button to reach it).                                                                                                                                                                                                                                                                                     |

**Helper:**

```ts
// inline in app/restaurant/[id]/page.tsx
async function handleLogAgain(source: ItemOrder) {
  const { error } = await supabase.from("item_orders").insert([
    {
      menu_item_id: source.menu_item_id,
      restaurant_id: source.restaurant_id,
      ordered_at: new Date().toISOString().slice(0, 10),
      liked: source.liked,
      notes: source.notes,
      drink_details: source.drink_details,
      photo_url: null, // photos are per-visit
    },
  ]);
  if (error) toast("Failed to log order", "error");
  else {
    toast("Logged again", "success");
    await reloadOrders();
  }
}
```

**Acceptance:**

- On a restaurant with prior orders, opening OrderModal shows them at the top with Log-again / Adjust-&-log buttons.
- The boba Usual Order card has a working "Log this again" primary action.
- A curator can "Check in & log order" in one modal-to-modal hop with no blank form between them.

---

### Phase 3 — Private / not-recommended restaurants

**Goal:** let curators log places they don't recommend without polluting the public guide.

**Schema (`MIGRATION_FLOW_3_VISIBILITY.sql`):**

```sql
alter table restaurants
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private', 'archived'));

create index if not exists restaurants_visibility_idx on restaurants(visibility);
```

All existing rows backfill to `'public'` via the default. No data migration required.

**Code changes:**

| File                                                                               | Change                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/supabase.ts`                                                                  | Add `visibility: 'public' \| 'private' \| 'archived'` to the `Restaurant` type.                                                                                                                                                            |
| `app/page.tsx`                                                                     | In the main `supabase.from("restaurants").select()` query, add `.eq("visibility", "public")` when `!isAdmin`. For admins, honour the new filter state (see below). Also filter `menu_items` fetch to public-restaurant IDs for non-admins. |
| `components/FilterBar.tsx`                                                         | Add admin-only visibility toggle: All · Public · Private · Archived. Default to "Public".                                                                                                                                                  |
| `app/restaurant/[id]/page.tsx`                                                     | If restaurant's `visibility !== 'public'` and viewer is not an admin → `notFound()` / redirect home. If viewer is admin, show a banner at the top ("🔒 Private — not shown in the public guide" / "📦 Archived — kept for history").       |
| `components/AddModal.tsx`                                                          | Add a `Visibility` selector at the top of the form (three segmented buttons). When `private`, grey out Must-Try + curator rating controls.                                                                                                 |
| `components/SurpriseBar.tsx` + the inline "Surprise me ✦" button in `app/page.tsx` | Filter to `visibility === 'public'` before picking.                                                                                                                                                                                        |
| Sitemap / any SEO data generation (if/when it lands from ROADMAP_1.7)              | Only emit `public` rows.                                                                                                                                                                                                                   |

**Acceptance:**

- Non-admin visitors see zero private/archived restaurants, anywhere.
- A curator can add a restaurant, pick "Private", log orders and check-ins against it, and see it in their admin filtered view.
- Surprise-me never rolls a private pick, regardless of role.

---

### Phase 4 — Curator's dining journal (follow-up)

**Goal:** a single view for the curator's own history across public and private restaurants.

**Schema:** none.

**Code changes:**

| File                             | Change                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `app/admin/journal/page.tsx` | Client component. Fetch: the current curator's `curator_ratings`, their authored `restaurant_visits` (where `visited_by === displayName`), and their `item_orders` (inferred by going through menu_items they created — or add an `added_by` column to `item_orders` in a small migration). Render as a chronological timeline: date → restaurant → (check-in or order or rating). Filterable by date range, cuisine, visibility. |
| `components/AdminButton.tsx`     | Add a "Journal" link in the floating admin menu.                                                                                                                                                                                                                                                                                                                                                                                  |

**Acceptance:**

- Curator lands on `/admin/journal`, sees a reverse-chronological feed of their own activity, including private restaurants.
- Filters work; no writes from this page.

---

### Cross-cutting: "curator" in the UI

A single find-and-replace pass on user-facing copy, not logic:

| File                                       | Current copy                                         | New copy                                                             |
| ------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `app/restaurant/[id]/page.tsx`             | "My rating", "My take", "Full order history (Admin)" | "Curators' rating", "Curators' take", "Full order history (Curator)" |
| `components/AddModal.tsx`                  | "My Rating" label                                    | "Your Curator Rating"                                                |
| Any toast / button label that says "Admin" |                                                      | "Curator"                                                            |

`isAdmin` / `isSuperuser` stay as the internal booleans — no refactor.

---

## 8. Open questions (remaining)

- **Curator attribution in backfill.** The Phase 1 migration has to attribute existing `restaurants.my_rating` values to a specific curator in the new `curator_ratings` table. Who? Safest default is the original superuser/owner; we can re-attribute later by editing `user_id` directly. Confirm the UUID before running.
- **What happens to old `item_orders.rating` signal.** The Phase 1 migration maps `>=4 → 👍`, `<=2 → 👎`, middle → null. That's a judgment call; if you'd rather preserve everything as 👍 or throw away the middle bucket, say so and we'll adjust the CASE.
- **`restaurants.my_rating` column.** Keep as a cached avg (updated in-app after each `curator_ratings` write) or drop it? Cached makes the home-page query cheap. I'd lean keep, updated via a DB trigger in the same migration — let me know if you want the trigger included.
- **Archived vs. Private.** Is "archived" actually useful or noise? If you can't think of a place you'd archive but not make private, we can ship only `public` / `private` and skip the third.

---

## 9. Summary of proposed changes

| Area                       | Today                                            | Proposed                                                                                                                       |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Curator rating             | Single manual `restaurants.my_rating`            | New `curator_ratings` table — one per (curator, restaurant). Detail page shows the average + every curator's individual rating |
| Per-dish rating            | 1–5 stars on `item_orders.rating`                | Thumbs up / down — `item_orders.liked` boolean                                                                                 |
| Visit rating               | Optional 1–5 stars on `restaurant_visits.rating` | **Removed.** Column dropped. CheckInModal has no rating field                                                                  |
| Rating history             | `rating_history` table (never shown)             | Dropped                                                                                                                        |
| Order logging              | Always a blank form                              | "Past orders" section in OrderModal with one-tap reuse                                                                         |
| Usual Order card           | Standalone section (boba only)                   | Becomes a badge on a tile in "What to order here"; primary "Log this again" action lives on the tile                           |
| Menu items I've tried      | Public section with fallback to all history      | Merged into "What to order here" — public sees curated tiles only, never raw history                                           |
| Full order history (Admin) | Flat chronological cards, curator only           | Replaced by "My history here" with `[By dish] \| [Timeline]` toggle; by-dish is default                                        |
| Check-in → order           | Dead code path                                   | Wired as a second primary button in CheckInModal                                                                               |
| Bottom action bar          | One button swaps label based on state            | Two persistent buttons for curators: Check in · Log order                                                                      |
| Restaurant visibility      | Implicit (every row is public)                   | New `visibility` column: `public` · `private` · `archived`                                                                     |
| Surprise me / random       | Pulls from all restaurants                       | Public-only                                                                                                                    |
| Role labels                | "Admin" in copy                                  | "Curator" in copy (internal booleans unchanged)                                                                                |
| Curator journal            | Scattered across admin page                      | Phase 4: dedicated `/admin/journal` view                                                                                       |
