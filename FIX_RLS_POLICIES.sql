-- Check and fix RLS policies for restaurants table
-- Run these queries in Supabase SQL Editor

-- 1. Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'restaurants';

-- 2. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'restaurants';

-- 3. If you see restrictive UPDATE policies, you may need to add a policy
-- that allows updates from the anon role (or authenticated role)

-- Option A: Allow all updates (less secure, but will work)
CREATE POLICY "Allow all updates" ON restaurants
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Option B: If you want to keep it secure, only allow updates from authenticated users
-- (You'll need to be using authenticated Supabase sessions)
-- CREATE POLICY "Allow authenticated updates" ON restaurants
--   FOR UPDATE
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');

-- 4. After adding the policy, verify it was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'restaurants' AND cmd = 'UPDATE';
