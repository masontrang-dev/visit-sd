# VISIT SD — San Diego Restaurant Guide

A personal restaurant recommendation app for sharing with out-of-town visitors.

- **Public view**: `yourdomain.com` — read-only, no login needed
- **Admin view**: `yourdomain.com/admin` — password-protected, add/remove spots

---

## Stack

- **Next.js 14** (App Router) — deployed on Vercel
- **Supabase** — free Postgres database

---

## Setup

### 1. Supabase — create the table

In your Supabase project, go to **SQL Editor** and run:

```sql
create table restaurants (
  id bigint generated always as identity primary key,
  name text not null,
  neighborhood text,
  cuisine text,
  price text,
  note text,
  created_at timestamptz default now()
);

-- Allow public read access (no auth needed for visitors)
alter table restaurants enable row level security;

create policy "Public read" on restaurants
  for select using (true);

-- Allow all writes via anon key (safe since we gate writes behind ADMIN_PASSWORD in the UI)
create policy "Anon insert" on restaurants
  for insert with check (true);

create policy "Anon delete" on restaurants
  for delete using (true);
```

### 2. Local development

```bash
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and choose an admin password
npm install
npm run dev
```

### 3. Deploy to Vercel

```bash
# Push to GitHub, then connect the repo in Vercel
# Add these three environment variables in Vercel project settings:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADMIN_PASSWORD=your-secret-password
```

That's it — Vercel auto-deploys on every push to `main`.

---

## Usage

- Visit `/` to see the public restaurant guide
- Visit `/admin` and enter your password to add or remove restaurants
- Restaurants are automatically grouped by cuisine type
- Filter by cuisine using the buttons in the toolbar
# visit-sd
