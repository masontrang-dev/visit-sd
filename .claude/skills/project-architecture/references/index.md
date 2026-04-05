# VISIT SD — Architecture Index

## Project Summary

VISIT SD is a personal San Diego restaurant recommendation app for sharing with out-of-town visitors. It has a public read-only view for browsing restaurants (with filtering, map view, and detail pages) and a password-protected admin panel for managing spots, tracking visits, logging orders, and viewing analytics. It also includes a specialized boba tea analytics dashboard.

## Tech Stack at a Glance

- **Framework**: Next.js (App Router) with React 18, TypeScript (strict mode)
- **Database**: Supabase (hosted Postgres) with RLS policies, accessed via `@supabase/supabase-js`
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode)
- **Maps**: Google Maps API via `@vis.gl/react-google-maps` and `@googlemaps/js-api-loader`
- **Auth**: Cookie-based sessions with bcrypt password hashing, user accounts in Supabase
- **Deployment**: Vercel (auto-deploy on push to `main`)
- **Design**: Custom design system — Bebas Neue (display) + DM Sans (body), sharp corners, orange-red accent

## How It Fits Together

The app is a client-heavy Next.js project. Almost everything is a client component (`"use client"`) that fetches data directly from Supabase. The only server-side logic is two API routes: `/api/auth` (session management via httpOnly cookies) and `/api/log-view` (analytics ingestion with IP geolocation). State management is plain React (`useState`/`useEffect`) — no external state library. An `AuthProvider` context wraps the app to share admin auth state.

```
Public visitors → / (browse, filter, map, restaurant detail pages)
Admin users    → /admin (CRUD restaurants, log visits, track orders, view analytics)
                 /admin/boba (boba tea analytics dashboard)
```

## Reference Files

| File | Description |
|------|-------------|
| [tech-stack.md](tech-stack.md) | Languages, frameworks, dependencies, and versions |
| [project-structure.md](project-structure.md) | Directory layout, file conventions, module boundaries |
| [data-model.md](data-model.md) | Database schema, Supabase tables, types, and RLS policies |
| [api-layer.md](api-layer.md) | API routes, data fetching patterns, external service integrations |
| [authentication.md](authentication.md) | Auth flow, session management, admin access control |
| [styling-and-design.md](styling-and-design.md) | Design system, CSS variables, Tailwind config, dark mode |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment (copy and fill in Supabase + Google Maps keys)
cp .env.example .env.local

# Run development server
npm run dev

# Build for production (check for TS errors)
npm run build

# Deploy — push to main, Vercel auto-deploys
git push origin main
```
