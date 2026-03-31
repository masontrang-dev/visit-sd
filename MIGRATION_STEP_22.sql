-- Step 22: User Analytics & Demographics Migration
-- Run this in Supabase SQL Editor to add geographic and device tracking fields

ALTER TABLE page_views
  ADD COLUMN ip_address inet,
  ADD COLUMN country text,
  ADD COLUMN region text,
  ADD COLUMN device_type text;

-- Note: The page_views table should already have RLS enabled with policies from Step 13
-- If not, run:
-- ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Anon insert" ON page_views FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Anon read" ON page_views FOR SELECT USING (true);
