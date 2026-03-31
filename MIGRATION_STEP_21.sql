-- Step 21: User Authentication System
-- Run this in Supabase SQL Editor

CREATE TABLE users (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read" ON users FOR SELECT USING (true);
CREATE POLICY "Anon insert" ON users FOR INSERT WITH CHECK (true);

-- Seed initial users using the seed-users.ts script
-- Run: npx tsx scripts/seed-users.ts
