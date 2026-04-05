-- Step 26: Add occasion tags and open/hours information
-- Run this in the Supabase SQL Editor

-- Add occasion tags array and open/hours fields to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS occasions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN,
ADD COLUMN IF NOT EXISTS hours_text TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- Add comment to explain the fields
COMMENT ON COLUMN restaurants.occasions IS 'Array of occasion tags like casual, date-friendly, family-friendly, etc.';
COMMENT ON COLUMN restaurants.is_open_now IS 'Whether the restaurant is currently open (populated from Google Places API)';
COMMENT ON COLUMN restaurants.hours_text IS 'Human-readable hours text like "Open · closes 10pm" or "Closed · opens 11am"';
COMMENT ON COLUMN restaurants.opening_hours IS 'Full opening hours data from Google Places API in JSON format';

-- Create index for occasions array to enable efficient querying
CREATE INDEX IF NOT EXISTS idx_restaurants_occasions ON restaurants USING GIN (occasions);
