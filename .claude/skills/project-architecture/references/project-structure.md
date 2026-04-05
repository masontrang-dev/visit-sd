# Project Structure

Directory layout, file conventions, and module boundaries for VISIT SD.

## Root Layout

No `src/` directory. Code lives at the project root following Next.js App Router conventions.

```
visitsd/
├── app/                    # Pages and API routes (App Router)
├── components/             # Flat directory of React components
├── lib/                    # Shared types and clients
├── scripts/                # One-off scripts (e.g., seed-users.ts)
├── *.sql                   # SQL migration files (run manually in Supabase)
├── STANDARDS.md            # Coding and design standards
├── ROADMAP.md              # Implementation checklist
├── next.config.js          # Next.js config (exposes app version from package.json)
├── tailwind.config.js      # Tailwind theme extensions (CSS variable references)
├── tsconfig.json           # TypeScript strict mode, @/* path alias
├── vercel.json             # Vercel framework hint (nextjs)
├── package.json            # v1.6.0, private, named "visitsd"
└── .env.local              # Secrets (gitignored)
```

## `app/` — Pages and API Routes

File-based routing via Next.js App Router. Each route has a `page.tsx`. The root `layout.tsx` is the **only server component** — everything else uses `"use client"`.

```
app/
├── layout.tsx              # Root layout (server). Wraps everything in AuthProvider,
│                           #   renders ThemeToggle + AdminButton globally.
├── page.tsx                # Public home — browse/filter/map restaurants
├── globals.css             # CSS variables, dark mode tokens, base styles
├── privacy/
│   └── page.tsx            # Privacy policy page
├── restaurant/
│   └── [id]/
│       └── page.tsx        # Dynamic restaurant detail page
├── admin/
│   ├── page.tsx            # Admin panel — CRUD restaurants, log visits, orders, analytics
│   ├── boba/
│   │   └── page.tsx        # Boba tea analytics dashboard
│   ├── analytics/          # (empty — reserved or unused)
│   └── restaurants/        # (empty — reserved or unused)
└── api/
    ├── auth/
    │   └── route.ts        # Session management (POST login, GET check, DELETE logout)
    └── log-view/
        └── route.ts        # Analytics ingestion (logs page views with IP geolocation)
```

### Route summary

| Path | Access | Purpose |
|------|--------|---------|
| `/` | Public | Restaurant grid with cuisine/neighborhood filters, map view |
| `/restaurant/[id]` | Public | Individual restaurant detail page |
| `/privacy` | Public | Privacy policy |
| `/admin` | Authenticated | Restaurant management, visit logging, order tracking |
| `/admin/boba` | Authenticated | Boba tea analytics dashboard |
| `/api/auth` | Server | Cookie-based session endpoints |
| `/api/log-view` | Server | Page view analytics ingestion |

## `components/` — Flat Component Directory

**Strictly flat** — no nested folders, one component per file. Each file default-exports one component.

```
components/
├── AddModal.tsx            # Add/edit restaurant modal (form + Google Places autocomplete)
├── AdminButton.tsx         # Floating admin link button (rendered in layout)
├── ConfirmModal.tsx        # Reusable confirmation dialog
├── FilterBar.tsx           # Cuisine/neighborhood filter bar + view toggle
├── MapView.tsx             # Google Maps view of restaurants
├── OrderModal.tsx          # Modal for logging menu item orders
├── RestaurantGrid.tsx      # Card grid with grouping and sorting
└── ThemeToggle.tsx         # Light/dark mode toggle (rendered in layout)
```

Components never call Supabase directly. They receive data and callbacks (`onSave`, `onClose`, `onDelete`) as props. See [api-layer.md](api-layer.md) for data fetching patterns.

## `lib/` — Shared Types and Clients

Contains modules shared across 3+ consumers.

```
lib/
├── supabase.ts             # Supabase client instance + all shared types
│                           #   (Restaurant, RestaurantVisit, MenuItem, etc.)
└── auth-context.tsx        # AuthProvider context — wraps app in layout.tsx,
                            #   exposes admin auth state to all client components
```

`supabase.ts` is the **single source of truth** for the database schema as TypeScript types. Every new column must be added here. See [data-model.md](data-model.md) for the full schema.

## `scripts/` — One-off Scripts

```
scripts/
├── README.md
└── seed-users.ts           # Seeds admin user accounts into Supabase
```

Run manually with `npx ts-node` or similar. Not part of the build pipeline.

## SQL Migration Files

Schema changes live as standalone `.sql` files at the project root. Named by convention:

- `MIGRATION_STEP_*.sql` — feature migrations tied to roadmap steps (e.g., `MIGRATION_STEP_22.sql`)
- `FIX_*.sql` — targeted fixes (e.g., `FIX_RLS_POLICIES.sql`, `FIX_PHOTO_URL_LENGTH.sql`)
- `DEBUG_*.sql` — diagnostic queries

These are run manually in the Supabase SQL Editor. There is no automated migration tool.

## Module Boundaries

### Import direction

```
layout.tsx  →  lib/auth-context.tsx  →  lib/supabase.ts
app/pages   →  components/*         →  (no Supabase imports)
app/pages   →  lib/supabase.ts
api/routes  →  lib/supabase.ts      →  (server-only, no component imports)
```

### Path alias

All imports use the `@/*` alias mapped to project root in `tsconfig.json`:

```ts
import { supabase, type Restaurant } from '@/lib/supabase';
import RestaurantGrid from '@/components/RestaurantGrid';
```

### Key rules (from STANDARDS.md)

- **No utility/helper files** unless shared by 3+ consumers. Colocate logic in the component that uses it.
- **No nested folders** inside `components/`.
- **One component per file.** Named sub-components (helper functions within a file) use function declarations; the main component uses default export.
- **Shared types** go in `lib/supabase.ts`, not in component files.
- **New pages** always go under `app/` following App Router conventions.
- **Props types** defined as `type Props = { ... }` at the top of each component file. Use `type` over `interface`.

## Config Files

| File | Purpose |
|------|---------|
| `next.config.js` | Exposes `package.json` version as `NEXT_PUBLIC_APP_VERSION` |
| `tsconfig.json` | Strict mode, `@/*` path alias, `ES2017` target, bundler module resolution |
| `tailwind.config.js` | Theme extensions mapping CSS variables to Tailwind utilities. See [styling-and-design.md](styling-and-design.md) |
| `postcss.config.js` | Standard Tailwind + autoprefixer setup |
| `vercel.json` | `{ "framework": "nextjs" }` |
| `.env.example` | Template for required env vars (Supabase, Google Maps, admin config) |
