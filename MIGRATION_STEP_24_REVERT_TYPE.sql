-- Simplify Step 24: Remove restaurant_type and use category instead
-- Run this in the Supabase SQL Editor

-- Remove restaurant_type column from restaurants table
ALTER TABLE restaurants DROP COLUMN IF EXISTS restaurant_type;
