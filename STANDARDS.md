# VISIT SD — Technical & Design Standards

> Reference document for all code contributions. Every implementation step in `ROADMAP.md` must conform to these standards.

---

## 1. Project Structure

```
visitsd/
├── app/
│   ├── layout.tsx          # Root layout (server component)
│   ├── page.tsx            # Public home page (client component)
│   ├── globals.css         # Global styles and CSS variables
│   └── admin/
│       └── page.tsx        # Admin page (client component)
├── components/
│   ├── AddModal.tsx        # Add/edit restaurant modal
│   ├── FilterBar.tsx       # Cuisine filter + action buttons
│   ├── RestaurantGrid.tsx  # Card grid with grouping
│   └── MapView.tsx         # (future) Interactive map
├── lib/
│   └── supabase.ts         # Supabase client + Restaurant type
├── .env.example            # Template for environment variables
├── .env.local              # Local secrets (gitignored)
├── ROADMAP.md              # Implementation checklist
├── STANDARDS.md            # This file
└── README.md               # Setup and deployment guide
```

### Rules

- **Flat component directory** — no nested folders inside `components/`. One component per file.
- **Shared types and clients** live in `lib/`.
- **No `src/` directory** — files live at the project root, following the Next.js App Router convention.
- **New pages** go under `app/` using the App Router file-based routing.
- **No utility/helper files** unless shared by 3+ consumers. Prefer colocating logic in the component that uses it.

---

## 2. TypeScript

- **Strict mode** is enabled in `tsconfig.json` — all code must pass strict type checking.
- **Use `type` over `interface`** for object shapes (existing convention).
- **Props types** are defined as `type Props = { ... }` at the top of each component file.
- **Import paths** use the `@/*` alias (maps to project root): `import { supabase } from '@/lib/supabase'`.
- **No `any`** — use `unknown` and narrow, or define a proper type.
- **Non-null assertions** (`!`) are only acceptable for environment variables that are guaranteed at build time.
- **Supabase types**: The `Restaurant` type in `lib/supabase.ts` is the single source of truth for the database schema. Every new column must be added here.

---

## 3. React & Next.js

### Component Conventions

- **`'use client'`** directive at the top of every component that uses hooks, event handlers, or browser APIs.
- **`layout.tsx`** is the only server component. All pages and components are client components.
- **Function declarations** (`function Card() {}`) for named sub-components within a file; **default exports** (`export default function AddModal() {}`) for the main component.
- **No class components** — functional components only.
- **State management**: `useState` + `useEffect` with Supabase queries. No external state library.
- **No context providers** unless state is shared across 3+ unrelated components.

### Data Fetching

- All data fetching happens client-side via the Supabase JS client.
- Queries use `.select('*')` with `.order()` for consistent sorting.
- **Always handle the error case** from Supabase responses — show an error message to the user, never silently swallow.
- **Loading states**: Every data fetch must have a corresponding `loading` boolean and a visible loading indicator.
- **Mutations** (insert/update/delete) must disable the triggering button while in-flight to prevent double submissions.

### Props

- Pass callbacks as props (`onSave`, `onClose`, `onDelete`) — child components never call Supabase directly.
- Use `Omit<Restaurant, 'id' | 'created_at'>` for insert payloads rather than defining a separate type.

---

## 4. Styling

### Design System (CSS Variables)

All colors, fonts, and shared values are defined as CSS custom properties in `globals.css`:

| Variable         | Value                 | Usage                             |
| ---------------- | --------------------- | --------------------------------- |
| `--accent`       | `#D85A30`             | Primary brand color (orange-red)  |
| `--accent2`      | `#1D9E75`             | Secondary accent (green)          |
| `--bg`           | `#FAFAF8`             | Page background                   |
| `--bg2`          | `#F1EFE8`             | Card hover / secondary background |
| `--txt`          | `#1a1a18`             | Primary text                      |
| `--txt2`         | `#5F5E5A`             | Secondary / muted text            |
| `--brd`          | `rgba(26,26,24,0.12)` | Borders and dividers              |
| `--font-display` | `'Bebas Neue'`        | Headlines and titles              |
| `--font-body`    | `'DM Sans'`           | Body text, labels, buttons        |

### Rules

- **Always reference CSS variables** — never hardcode color hex values in components. The only exception is `#fff` for white text on colored backgrounds.
- **Inline styles via `React.CSSProperties`** — this is the current convention. Do not introduce CSS modules or styled-components.
- **After Tailwind migration (Step 15)**: Tailwind utility classes replace inline styles. CSS variables migrate to Tailwind theme config.
- **Shared style objects** (e.g. `inputStyle`, `labelStyle`, `gridStyle`) are defined as `const` at the top of the file, not inline.
- **No external CSS files per component** — all styling is colocated in the component file.

### Typography

| Element              | Font       | Size                                  | Weight |
| -------------------- | ---------- | ------------------------------------- | ------ |
| Page title (hero)    | Bebas Neue | `clamp(56px, 12vw, 96px)`             | 400    |
| Section headers      | Bebas Neue | 22px                                  | 400    |
| Card restaurant name | Bebas Neue | 28px                                  | 400    |
| Modal title          | Bebas Neue | 36px                                  | 400    |
| Body text / notes    | DM Sans    | 13–15px                               | 400    |
| Labels (uppercase)   | DM Sans    | 10–11px, `letter-spacing: 0.1–0.15em` | 500    |
| Buttons              | DM Sans    | 13–14px                               | 500    |
| Pill badges          | DM Sans    | 12px                                  | 500    |

### Spacing & Layout

- **Page padding**: `1.5rem` horizontal, `2.5rem` top on headers.
- **Card padding**: `1.25rem`.
- **Grid**: `repeat(auto-fill, minmax(260px, 1fr))` with `gap: 0` and visible borders via background color trick.
- **Border radius**: `0` for cards, inputs, and buttons (sharp corners). `20px` for pill badges and filter buttons only.
- **Transitions**: `0.12s` for hover and focus states.

### Interactive States

- **Buttons**: Solid fill when active (`var(--txt)` bg, `var(--bg)` text), transparent with border when inactive.
- **Inputs**: `1.5px solid var(--brd)` default, `var(--accent)` on focus.
- **Cards**: Background changes to `var(--bg2)` on hover via `onMouseEnter`/`onMouseLeave`.
- **Destructive actions**: Use `var(--accent)` (orange-red) for delete/remove, with `opacity: 0.6` at rest.

---

## 5. Database (Supabase)

### Schema Conventions

- **Table name**: `restaurants` (lowercase, plural).
- **Primary key**: `id bigint generated always as identity`.
- **Timestamps**: `created_at timestamptz default now()`.
- **Text fields**: Use `text`, not `varchar` — no length limits needed.
- **Booleans**: `boolean default false`.
- **Coordinates**: `double precision` for `lat`/`lng`.
- **No foreign keys** — this is a single-table app. If a second table is added (e.g. `page_views`), keep them independent.

### Row Level Security

- **RLS is always enabled** on every table.
- **Public read**: `for select using (true)` — anyone can read.
- **Anon write**: `for insert/update/delete with check (true)` / `using (true)` — writes are gated by the admin password in the UI, not at the DB level.
- **Every new table** must have RLS enabled and policies defined before use.

### Migrations

- All schema changes are documented as SQL in `ROADMAP.md` at the relevant step.
- Run manually in Supabase SQL Editor (no migration tool — keep it simple).
- **Never drop columns** on existing tables without verifying no code references them.

---

## 6. Environment Variables

### Naming

- **Client-exposed**: Prefixed with `NEXT_PUBLIC_` — accessible in browser JS.
- **Server-only** (future): No prefix — only available in Route Handlers and server components.

### Required Variables

| Variable                          | Scope                  | Purpose                                  |
| --------------------------------- | ---------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Client                 | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Client                 | Supabase anonymous API key               |
| `NEXT_PUBLIC_ADMIN_PASSWORD`      | Client (until Step 14) | Admin login password                     |
| `NEXT_PUBLIC_ADMIN_NAMES`         | Client                 | Comma-separated admin names for dropdown |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client                 | Google Maps/Places API key               |

### Rules

- **Never commit secrets** — `.env.local` is gitignored.
- **`.env.example`** must be updated whenever a new variable is added, with a placeholder value and comment.
- **Access pattern**: `process.env.NEXT_PUBLIC_*` with non-null assertion (`!`) since the app cannot function without them.

---

## 7. Security

### Current Model

- Admin access is gated by a password stored in `NEXT_PUBLIC_ADMIN_PASSWORD`.
- This is visible in the client JS bundle — acceptable for a personal app, but scheduled for replacement in Step 14.

### Rules

- **No API keys or passwords in source code** — always use environment variables.
- **Google Maps API key** must be restricted in Google Cloud Console:
  - HTTP referrer restriction to your domain(s)
  - API restriction to only Places API + Maps JavaScript API
- **Supabase anon key** is safe to expose (it's designed for client use) — RLS policies control access.
- **No PII in analytics** — `page_views` table stores path, referrer, user-agent, and optional city only. No IP addresses, no cookies, no user identifiers.

---

## 8. Performance

- **No unnecessary re-renders**: Avoid defining objects/arrays/functions inside JSX. Use `const` at the component or module level for stable references.
- **Supabase calls**: Fetch once on mount, re-fetch after mutations. No polling or real-time subscriptions (unnecessary for this use case).
- **Google Maps**: Load the API script lazily (only when the map view or autocomplete is needed). Use `@googlemaps/js-api-loader` — do not add the script tag globally.
- **Images** (future photo support): Use `next/image` for automatic optimization, or constrain dimensions in CSS if using raw `<img>`.
- **Bundle size**: No large UI frameworks (Material UI, Chakra, etc.). Keep dependencies minimal — currently only `next`, `react`, `react-dom`, `@supabase/supabase-js`.

---

## 9. Accessibility

- **Semantic HTML**: Use `<main>`, `<header>`, `<section>`, `<button>`, `<label>` — not `<div>` for interactive elements.
- **Labels**: Every form input must have an associated `<label>`.
- **Keyboard navigation**: Modal closes on `Escape`. Forms submit on `Enter`. All interactive elements are focusable.
- **Color contrast**: Text on backgrounds must meet WCAG AA (4.5:1 for body text, 3:1 for large text). Current palette passes — maintain this when adding dark mode.
- **Alt text**: All images (future photo support) must have descriptive `alt` attributes.
- **Focus indicators**: Do not remove default browser focus outlines unless replacing with a visible custom style.

---

## 10. Error Handling

- **Supabase queries**: Always destructure `{ data, error }`. If `error` is truthy, display a user-facing message — never silently ignore.
- **Network failures**: Wrap critical fetches in try/catch. Show a retry-friendly error state.
- **Form validation**: Require `name` before allowing save (existing). Validate at the UI level — the database has `not null` on `name` only.
- **Google Maps API failures**: Gracefully degrade — if the API fails to load, the autocomplete input should fall back to a plain text input. The map view should show an error message, not a blank area.

---

## 11. Git & Deployment

- **Branch strategy**: Push to `main` — Vercel auto-deploys.
- **`.gitignore`**: Must include `.env.local`, `.next/`, `node_modules/`.
- **Environment variables**: Set in Vercel project settings for production. Local development uses `.env.local`.
- **No build step configuration needed** — Vercel auto-detects Next.js.
- **Pre-deploy check**: Run `npm run build` locally to catch TypeScript errors before pushing.
