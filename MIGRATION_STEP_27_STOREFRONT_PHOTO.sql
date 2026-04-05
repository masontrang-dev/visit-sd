-- Step 27: Separate storefront photos from user-uploaded photos
-- Run this in the Supabase SQL Editor

-- Add storefront_photo_url column for Google Places photos
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS storefront_photo_url TEXT;

COMMENT ON COLUMN restaurants.storefront_photo_url IS 'Google Places storefront photo URL, used as fallback when no user-uploaded photo exists';

-- Move Google-seeded photos (containing googleapis.com) from photo_url to storefront_photo_url
UPDATE restaurants
SET storefront_photo_url = photo_url,
    photo_url = NULL
WHERE photo_url LIKE '%googleapis.com%';
