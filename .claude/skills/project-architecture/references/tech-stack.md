# Tech Stack

## Framework & Runtime

**Next.js 16.2.1** with the App Router. React 18, TypeScript 5 in strict mode.

Despite using App Router, this is a **client-heavy** app. Every page and component uses `"use client"` — there are no React Server Components doing data fetching. The root layout (`app/layout.tsx`) is the only server component and it just provides the HTML shell, theme-flicker-prevention script, and wraps everything in `AuthProvider`.

The only server-side logic lives in two API Route Handlers:
- `app/api/auth/route.ts` — session management (POST/GET/DELETE)
- `app/api/log-view/route.ts` — analytics ingestion with IP geolocation via ipapi.co

**TypeScript config** (`tsconfig.json`): strict mode enabled, `bundler` module resolution, path alias `@/*` mapped to repo root. Target ES2017.

**Next config** (`next.config.js`): minimal — exposes `package.json` version as `NEXT_PUBLIC_APP_VERSION` env var. No custom webpack, no image domains, no rewrites.

## Database — Supabase

**`@supabase/supabase-js` ^2.43.0** is the sole database client. There is no ORM, no Prisma, no Drizzle.

A single shared Supabase client is created in `lib/supabase.ts` and exported. API routes create their own client instances locally (same pattern, different file scope). All clients use the anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — there is no service role key in use.

Usage patterns:
- **Reads**: Client components call `supabase.from("table").select(...)` directly inside `useEffect` hooks
- **Writes**: Client components call `supabase.from("table").insert/update/delete(...)` directly (admin-only actions gated by UI, not by RLS on the client)
- **Storage**: `supabase.storage.from("bucket")` for photo uploads (restaurant photos, order photos) in `AddModal` and `OrderModal`
- **RPC**: `supabase.rpc("get_last_cleanup_run")` called from admin page

All type definitions live in `lib/supabase.ts` alongside the client — `Restaurant`, `RestaurantVisit`, `MenuItem`, `ItemOrder`, `DrinkDetails`, `PageView`. These are hand-written TS types, not generated from the database schema.

See [data-model.md](data-model.md) for table schema and RLS details.

## Authentication

**`bcryptjs` ^3.0.3** — used server-side only in `app/api/auth/route.ts` to verify passwords against hashed values stored in a `users` table. Cookie-based sessions (`admin_session` httpOnly cookie, 7-day expiry). No JWT, no Supabase Auth — it's a custom roll.

Auth state is shared app-wide via `AuthProvider` context (`lib/auth-context.tsx`), which exposes `isAdmin`, `username`, `login()`, `logout()`, and `checkAuth()`.

See [authentication.md](authentication.md) for the full flow.

## Maps — Google Maps

Two packages, two distinct uses:

- **`@vis.gl/react-google-maps` ^1.8.1** — React components (`APIProvider`, `Map`, `AdvancedMarker`, `InfoWindow`) used in `components/MapView.tsx` for the public-facing restaurant map. Centers on San Diego (32.7157, -117.1611).

- **`@googlemaps/js-api-loader` ^2.0.2** — imperative API used in `components/AddModal.tsx` for the Google Places Autocomplete input in the admin add/edit restaurant form. Loads the `places` library on demand via `importLibrary("places")`.

Both require `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with Places API and Maps JavaScript API enabled.

## Image Handling

**`browser-image-compression` ^2.0.2** — client-side image compression before upload. Used in:
- `components/AddModal.tsx` — restaurant photo uploads
- `components/OrderModal.tsx` — order photo uploads

Compressed images are uploaded to Supabase Storage buckets.

## Styling

**Tailwind CSS ^3.4.19** with PostCSS and autoprefixer. Standard setup:
- `tailwind.config.js` — scans `app/`, `components/`, `lib/` for class usage
- `postcss.config.js` — tailwindcss + autoprefixer plugins
- Dark mode via `class` strategy (toggled by `ThemeToggle` component, persisted to `localStorage`)

The design system is built on **CSS custom properties** bridged into Tailwind:
```
colors: accent, accent2, bg, bg2, txt, txt2, brd
fonts:  font-display (Bebas Neue), font-body (DM Sans)
```

Light/dark themes defined in `app/globals.css` under `:root` and `.dark` selectors. Accent color: `#d85a30` (light) / `#e8734f` (dark). Fonts loaded via Google Fonts CDN import in `globals.css`.

Note: `@tailwindcss/postcss` ^4.2.2 is in devDependencies but the actual config uses Tailwind v3 patterns (`@tailwind base/components/utilities` directives in globals.css, v3-style `tailwind.config.js`). The v4 PostCSS plugin is installed but not actively driving the build — the v3 config takes precedence.

See [styling-and-design.md](styling-and-design.md) for the full design system.

## State Management

Plain React. No Redux, Zustand, or other state library. Patterns used:
- `useState` / `useEffect` for local component state and data fetching
- `useCallback` / `useRef` for performance and DOM refs (e.g., autocomplete input)
- `createContext` / `useContext` for auth state (`AuthProvider`)

## Environment Variables

Defined in `.env.local` (see `.env.example` for the template):

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Google Maps + Places API key |
| `NEXT_PUBLIC_APP_VERSION` | Client | Auto-set from `package.json` version via `next.config.js` |

All env vars are `NEXT_PUBLIC_*` prefixed (exposed to browser). There are no server-only secrets — the auth route uses the same anon key, and password hashing happens server-side with bcryptjs (no secret key needed).

## Build & Dev

```bash
npm run dev    # next dev — local development
npm run build  # next build — production build, catches TS errors
npm run start  # next start — serve production build locally
npm run lint   # next lint — ESLint with eslint-config-next (v14.2.5)
```

Note: `eslint-config-next` is pinned to 14.2.5 while Next.js itself is ^16.2.1. This works but may miss newer lint rules.

## Deployment

**Vercel** — auto-deploys on push to `main`. Config is minimal (`vercel.json` just declares `"framework": "nextjs"`). No custom build commands, no edge functions, no middleware.

## Testing

No test framework is installed. No test files exist. No `test` script in `package.json`.

## What's NOT in the Stack

Things you might expect but won't find:
- No ORM (Prisma, Drizzle) — raw Supabase client queries
- No state management library (Redux, Zustand)
- No form library (React Hook Form, Formik) — forms are manual `useState`
- No data fetching library (React Query, SWR) — `useEffect` + direct Supabase calls
- No component library (shadcn, Radix, MUI) — all components are hand-built
- No test framework (Jest, Vitest, Playwright)
- No CI/CD pipeline beyond Vercel's auto-deploy
- No monorepo tooling — single package, flat structure
