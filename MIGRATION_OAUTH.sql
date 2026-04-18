-- OAuth Authentication Migration
-- This migration adds support for Supabase Auth with role-based access control
-- Run this in Supabase SQL Editor

-- Step 1: Create user_roles table to store role assignments
CREATE TABLE IF NOT EXISTS user_roles (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('superuser', 'admin', 'user')),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique(user_id, role)
);

-- Step 2: Create user_profiles table for additional user metadata
CREATE TABLE IF NOT EXISTS user_profiles (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Step 3: Enable RLS on new tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies for user_roles
-- Users can read their own roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Superusers and admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('superuser', 'admin')
    )
  );

-- Only superusers can insert/update/delete roles
CREATE POLICY "Only superusers can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'superuser'
    )
  );

-- Step 5: RLS Policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('superuser', 'admin')
    )
  );

-- Step 6: Create helper functions
-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_id uuid, required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = has_role.user_id
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is admin or superuser
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = is_admin.user_id
    AND role IN ('admin', 'superuser')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_id uuid)
RETURNS text[] AS $$
  SELECT ARRAY_AGG(role) FROM user_roles WHERE user_roles.user_id = get_user_roles.user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 7: Create trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Assign default 'user' role to new signups
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 8: Migrate existing users table data (if needed)
-- This is commented out - only run if you want to preserve old username/password users
-- You'll need to manually map old users to new OAuth users after they sign in

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Step 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON user_roles TO anon, authenticated;
GRANT SELECT ON user_profiles TO anon, authenticated;
GRANT UPDATE ON user_profiles TO authenticated;

-- IMPORTANT: After running this migration, you need to manually assign yourself as superuser
-- Run this query with your user_id (get it from auth.users table after you sign in):
-- 
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('YOUR-USER-ID-HERE', 'superuser')
-- ON CONFLICT (user_id, role) DO NOTHING;
--
-- To find your user_id after signing in, run:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
