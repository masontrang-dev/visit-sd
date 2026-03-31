-- Step 23: Add photo_url column to restaurants table
-- Run this in Supabase SQL Editor to enable photo storage for restaurants

ALTER TABLE restaurants
  ADD COLUMN photo_url text;

-- Optional: Add comment to document the column
COMMENT ON COLUMN restaurants.photo_url IS 'Public URL to restaurant photo stored in Supabase Storage';
