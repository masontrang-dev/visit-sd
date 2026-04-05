# Authentication & Access Control

## Overview

VISIT SD uses a simple cookie-based session system for admin access. There is no user registration flow -- accounts are seeded directly into the database. Authentication protects the admin UI (restaurant CRUD, visit logging, analytics), while the public-facing site is fully anonymous.

**Key architectural fact:** There is no middleware-level route protection. All write protection is UI-gated through the `isAdmin` flag in React context. Supabase RLS policies allow all operations via the anon key. This means the API surface (Supabase) is unprotected at the database level -- security relies entirely on the admin UI not being rendered for unauthenticated users.

## Auth Flow

```
Login:
  Client (login form) --POST /api/auth--> Server validates credentials
    --> bcrypt.compare(password, password_hash)
    --> Sets httpOnly cookie "admin_session" = username (7-day maxAge)
    --> Client sets isAdmin=true in AuthContext

Session Check (on every page load):
  AuthProvider mounts --> GET /api/auth --> reads cookie
    --> Returns { authed: bool, username: string | null }
    --> Client sets isAdmin accordingly

Logout:
  Client --> DELETE /api/auth --> clears cookie (maxAge=0)
    --> Client sets isAdmin=false
```

## Key Files

| File | Role |
|------|------|
| `app/api/auth/route.ts` | Server-side auth API (POST login, GET session check, DELETE logout) |
| `lib/auth-context.tsx` | `AuthProvider` context + `useAuth()` hook |
| `app/layout.tsx` | Wraps entire app in `<AuthProvider>` |
| `components/AdminButton.tsx` | Floating admin menu (visible only when `isAdmin`) |
| `app/admin/page.tsx` | Admin panel -- shows login form if not authed, admin UI if authed |
| `app/admin/boba/page.tsx` | Boba dashboard -- same client-side auth gating pattern |
| `scripts/seed-users.ts` | Seeds user accounts into Supabase |
| `MIGRATION_STEP_21.sql` | Creates the `users` table |

## Server-Side Auth API

**File:** `app/api/auth/route.ts`

Three HTTP methods on a single route:

- **POST** -- Login. Accepts `{ username, password }`. Looks up the user in the `users` table via Supabase, compares password with `bcrypt.compare()`. On success, sets an httpOnly cookie named `admin_session` containing the username. Cookie config: `httpOnly`, `secure` in production, `sameSite: lax`, `path: /`, 7-day `maxAge`.
- **GET** -- Session check. Reads the `admin_session` cookie and returns `{ authed, username }`. No database lookup -- it trusts the cookie's existence.
- **DELETE** -- Logout. Clears the cookie by setting `maxAge: 0`.

The route creates its own Supabase client using the anon key (not a service role key). This works because the `users` table has permissive RLS policies.

## Client-Side Auth Context

**File:** `lib/auth-context.tsx`

`AuthProvider` wraps the entire app in `app/layout.tsx`. It exposes:

- `isAdmin: boolean` -- whether the user is authenticated
- `isLoading: boolean` -- true during initial session check
- `username: string | null` -- the logged-in username
- `login(username, password)` -- calls POST, returns success boolean
- `logout()` -- calls DELETE, resets state
- `checkAuth()` -- calls GET, updates state

On mount, `useEffect` calls `checkAuth()` to restore sessions from the cookie. Components consume this via the `useAuth()` hook.

## Admin Page Gating Pattern

Both admin pages follow the same pattern:

```tsx
const { isAdmin, isLoading: authLoading } = useAuth();

// 1. Show loading spinner while checking session
if (authLoading) return <Loading />;

// 2. Show login form if not authenticated
if (!isAdmin) return <LoginForm />;

// 3. Show admin UI
return <AdminUI />;
```

The login form on `/admin` calls `login(username, password)` from the auth context. On success, `isAdmin` flips to `true` and the component re-renders to show the admin UI. There is no redirect -- it's a conditional render within the same page component.

`AdminButton` (floating "A" button in the top-right) also checks `isAdmin` and returns `null` if false, so it's invisible to public visitors.

## Database: Users Table

**Created by:** `MIGRATION_STEP_21.sql`

```sql
CREATE TABLE users (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);
```

RLS is enabled with fully permissive policies (anon can SELECT and INSERT). This is not ideal -- it means anyone with the Supabase anon key could read password hashes or insert new users. In practice, the anon key is exposed client-side in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Seeding Users

**File:** `scripts/seed-users.ts`

Run with `npx tsx scripts/seed-users.ts`. Reads credentials from `.env.local`, hashes passwords with `bcrypt` (10 salt rounds), and inserts into the `users` table. The script hardcodes the initial accounts.

## Security Considerations

**What is protected:**
- Passwords are hashed with bcrypt (10 rounds)
- Session cookie is httpOnly (not accessible to client JS)
- Cookie is secure-only in production
- Login errors are generic ("Invalid username or password") -- no user enumeration

**What is not protected:**
- No middleware route protection -- `/admin` is accessible to anyone, the login gate is purely client-side rendering
- No CSRF protection on the auth endpoint
- Supabase writes (INSERT, UPDATE, DELETE on `restaurants` and other tables) are not gated by auth at the database level -- RLS policies are fully permissive for the anon role
- The `users` table itself is readable via the anon key (password hashes are exposed to anyone who queries Supabase directly)
- The session cookie stores the raw username, not a signed/encrypted token -- cookie tampering could grant access (setting `admin_session=anything` would pass the GET check since it only checks for cookie existence, not validity)
- No rate limiting on login attempts

**If you need to harden this:** The most impactful changes would be (1) adding Next.js middleware to protect `/admin` routes server-side, (2) using a signed JWT or opaque session token instead of the raw username in the cookie, (3) tightening RLS policies to require authenticated Supabase sessions for writes, and (4) restricting SELECT on the `users` table.

## Cross-References

- **Data model:** See [data-model.md](data-model.md) for full schema including the `users` table and RLS policies across all tables.
- **API layer:** See [api-layer.md](api-layer.md) for the `/api/auth` route in context with other API routes.
- **Project structure:** See [project-structure.md](project-structure.md) for where auth-related files live in the directory tree.
