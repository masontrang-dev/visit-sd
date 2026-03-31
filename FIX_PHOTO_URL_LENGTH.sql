-- Fix photo_url column length issue
-- The column is currently truncating URLs at 100 characters
-- Run this in Supabase SQL Editor to fix the issue

-- First, check current column type
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'restaurants' AND column_name = 'photo_url';

-- Change the column type to TEXT (unlimited length)
-- If it's currently varchar(100), this will fix the truncation
ALTER TABLE restaurants
  ALTER COLUMN photo_url TYPE text;

-- Verify the change
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'restaurants' AND column_name = 'photo_url';
