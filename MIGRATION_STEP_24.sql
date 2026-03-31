-- Step 24: Item Ordering, Reviews & Drink Customization
-- Run this in the Supabase SQL Editor

-- Add restaurant type to existing table
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS restaurant_type text DEFAULT 'standard';

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id            bigint generated always as identity primary key,
  restaurant_id bigint references restaurants(id) on delete cascade,
  name          text not null,
  category      text,
  description   text,
  is_recommended boolean default false,
  created_at    timestamptz default now()
);

-- Item orders table
CREATE TABLE IF NOT EXISTS item_orders (
  id             bigint generated always as identity primary key,
  menu_item_id   bigint references menu_items(id) on delete cascade,
  restaurant_id  bigint references restaurants(id) on delete cascade,
  ordered_at     date default current_date,
  rating         int check (rating between 1 and 5),
  notes          text,
  photo_url      text,
  drink_details  jsonb,
  created_at     timestamptz default now()
);

-- RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read menu_items"  ON menu_items  FOR SELECT USING (true);
CREATE POLICY "Anon insert menu_items"  ON menu_items  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update menu_items"  ON menu_items  FOR UPDATE USING (true);
CREATE POLICY "Anon delete menu_items"  ON menu_items  FOR DELETE USING (true);

CREATE POLICY "Public read item_orders" ON item_orders FOR SELECT USING (true);
CREATE POLICY "Anon insert item_orders" ON item_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update item_orders" ON item_orders FOR UPDATE USING (true);
CREATE POLICY "Anon delete item_orders" ON item_orders FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS item_orders_restaurant_id_idx ON item_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS item_orders_menu_item_id_idx  ON item_orders(menu_item_id);
CREATE INDEX IF NOT EXISTS item_orders_ordered_at_idx    ON item_orders(ordered_at desc);
CREATE INDEX IF NOT EXISTS menu_items_restaurant_id_idx  ON menu_items(restaurant_id);

-- Storage bucket for item photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read item-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-photos');

CREATE POLICY "Anon upload item-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-photos');

CREATE POLICY "Anon delete item-photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'item-photos');
