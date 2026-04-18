# OAuth Authentication Setup Guide

This guide will walk you through setting up OAuth authentication with Supabase and configuring yourself as the superuser.

## Overview

The app now uses **Supabase Auth** with OAuth providers (Google, GitHub) and a role-based access control system with three roles:
- **superuser**: Full access, can manage user roles
- **admin**: Can manage restaurants and content
- **user**: Basic authenticated user (read-only access)

## Step 1: Run the Database Migration

1. Open your Supabase project dashboard
2. Go to the **SQL Editor**
3. Open the `MIGRATION_OAUTH.sql` file from your project root
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the migration

This will create:
- `user_roles` table for role assignments
- `user_profiles` table for user metadata
- RLS policies for secure access control
- Helper functions for role checking
- Automatic trigger to create profiles for new users

## Step 2: Configure OAuth Providers in Supabase

### Google OAuth Setup

1. Go to your Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** in the list and click to configure
3. Enable the Google provider
4. You'll need to create OAuth credentials in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google+ API
   - Go to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Add authorized redirect URIs:
     - `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
   - Copy the **Client ID** and **Client Secret**
5. Paste the Client ID and Client Secret into Supabase
6. Click **Save**

### GitHub OAuth Setup

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Find **GitHub** and click to configure
3. Enable the GitHub provider
4. Create a GitHub OAuth App:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **New OAuth App**
   - Fill in the details:
     - Application name: Your app name
     - Homepage URL: Your production URL
     - Authorization callback URL: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   - Click **Register application**
   - Copy the **Client ID**
   - Generate a new **Client Secret** and copy it
5. Paste the Client ID and Client Secret into Supabase
6. Click **Save**

## Step 3: Update Environment Variables

Your `.env.local` file should already have:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

No additional environment variables are needed for OAuth!

## Step 4: Set Yourself as Superuser

After running the migration and configuring OAuth:

1. **Sign in to your app** using Google or GitHub OAuth
2. Go to your Supabase Dashboard → **Authentication** → **Users**
3. Find your user account in the list and copy your **User ID** (UUID format)
4. Go to **SQL Editor** and run this query (replace `YOUR-USER-ID-HERE` with your actual user ID):

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR-USER-ID-HERE', 'superuser')
ON CONFLICT (user_id, role) DO NOTHING;
```

5. Refresh your app - you should now have full admin access!

## Step 5: Grant Admin Access to Others

As a superuser, you can grant admin access to other users:

1. Have the user sign in to the app first (so their account is created)
2. Get their User ID from Supabase Dashboard → **Authentication** → **Users**
3. Run this SQL query:

```sql
-- Grant admin role
INSERT INTO user_roles (user_id, role, created_by)
VALUES ('THEIR-USER-ID-HERE', 'admin', 'YOUR-USER-ID-HERE')
ON CONFLICT (user_id, role) DO NOTHING;
```

To revoke admin access:

```sql
DELETE FROM user_roles
WHERE user_id = 'THEIR-USER-ID-HERE'
AND role = 'admin';
```

## Step 6: Test the Setup

1. **Test OAuth Login**:
   - Go to `/admin`
   - Click "Sign in with Google" or "Sign in with GitHub"
   - You should be redirected to the OAuth provider
   - After authorization, you should be redirected back to `/admin`

2. **Test Role-Based Access**:
   - As a superuser, you should see all admin features
   - Try signing in with a different account (without roles) - they should see an "access denied" message

3. **Test Middleware Protection**:
   - Sign out
   - Try to access `/admin` directly - you should be redirected to the home page

## Architecture Changes

### What Changed

1. **Authentication Method**: 
   - Old: Username/password with bcrypt
   - New: OAuth with Supabase Auth (Google, GitHub)

2. **Session Management**:
   - Old: Custom cookie-based sessions
   - New: Supabase Auth sessions (JWT tokens)

3. **Authorization**:
   - Old: Simple admin/non-admin check
   - New: Role-based access control (superuser, admin, user)

4. **Route Protection**:
   - Old: Client-side only (UI gating)
   - New: Server-side middleware + client-side UI gating

### New Files

- `lib/supabase-server.ts` - Server-side Supabase client
- `lib/supabase-client.ts` - Client-side Supabase client
- `lib/auth-helpers.ts` - Server-side auth helper functions
- `app/auth/callback/route.ts` - OAuth callback handler
- `middleware.ts` - Route protection middleware
- `MIGRATION_OAUTH.sql` - Database migration script

### Modified Files

- `lib/auth-context.tsx` - Refactored to use Supabase Auth
- `app/admin/page.tsx` - Updated login UI to use OAuth buttons
- `package.json` - Added `@supabase/ssr` dependency

### Deprecated Files

These files are no longer used but kept for reference:
- `app/api/auth/route.ts` - Old username/password auth API
- `MIGRATION_STEP_21.sql` - Old users table (can be dropped)

## Security Improvements

The new OAuth system provides several security benefits:

1. **No password storage** - Passwords are managed by OAuth providers
2. **Server-side route protection** - Middleware blocks unauthorized access
3. **Proper RLS policies** - Database-level security for user roles
4. **JWT-based sessions** - Secure, stateless authentication
5. **Role-based access control** - Granular permission management

## Troubleshooting

### "Your account does not have admin access"

This means you've signed in successfully but don't have the admin or superuser role assigned. Follow Step 4 to grant yourself the superuser role.

### OAuth redirect not working

1. Check that your OAuth redirect URIs are correctly configured in both:
   - Your OAuth provider (Google/GitHub)
   - Supabase Auth settings
2. Make sure the URLs match exactly (including http/https)
3. For local development, use `http://localhost:3000/auth/callback`
4. For production, use your actual domain

### "Unauthorized" error

1. Check that your Supabase environment variables are correct
2. Make sure you've run the database migration
3. Verify that the user has been created in the `auth.users` table

### Can't access admin page after signing in

1. Check browser console for errors
2. Verify the auth callback route is working: `/auth/callback`
3. Check that middleware is not blocking the request
4. Clear browser cookies and try again

## Next Steps

- Consider adding more OAuth providers (Microsoft, Apple, etc.)
- Implement email/password authentication as a fallback
- Add a user management UI for superusers
- Set up email notifications for new user signups
- Configure custom email templates in Supabase

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the Dashboard → **Logs**
3. Verify all environment variables are set correctly
4. Ensure the database migration ran successfully
