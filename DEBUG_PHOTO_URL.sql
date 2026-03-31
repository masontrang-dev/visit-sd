-- Debug script to check photo_url column and test updates
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if photo_url column exists and its properties
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants' AND column_name = 'photo_url';

-- 2. Check current photo_url values in the restaurants table
SELECT id, name, photo_url
FROM restaurants
ORDER BY id;

-- 3. Test updating a specific restaurant (replace ID 11 with your test restaurant)
UPDATE restaurants
SET photo_url = 'https://ppkbxvpbfwbwgwkikkac.supabase.co/storage/v1/object/public/restaurant-photos/1774919027053-u88uf.jpg'
WHERE id = 11;

-- 4. Verify the update worked
SELECT id, name, photo_url
FROM restaurants
WHERE id = 11;

-- 5. Check RLS policies on restaurants table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'restaurants';
