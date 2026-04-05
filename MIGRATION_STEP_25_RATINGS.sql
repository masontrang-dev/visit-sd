-- Add rating fields to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS google_review_count INTEGER,
ADD COLUMN IF NOT EXISTS my_rating INTEGER CHECK (my_rating >= 1 AND my_rating <= 5);

-- Create rating history table to track changes to my_rating over time
CREATE TABLE IF NOT EXISTS rating_history (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  changed_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rating_history_restaurant_id ON rating_history(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_created_at ON rating_history(created_at DESC);

-- Enable RLS on rating_history
ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to rating history
CREATE POLICY "Allow public read access to rating history" ON rating_history
  FOR SELECT USING (true);

-- Allow authenticated users to insert rating history
CREATE POLICY "Allow authenticated insert to rating history" ON rating_history
  FOR INSERT WITH CHECK (true);
