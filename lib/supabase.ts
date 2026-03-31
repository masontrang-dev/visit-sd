import { createClient } from "@supabase/supabase-js";

export type Restaurant = {
  id: number;
  name: string;
  neighborhood: string;
  cuisine: string;
  price: string;
  note: string;
  created_at: string;
  added_by: string | null;
  address: string | null;
  google_maps_url: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  must_try: boolean;
  date_added: string | null;
  last_visited: string | null;
};

export type RestaurantVisit = {
  id: number;
  restaurant_id: number;
  visited_by: string;
  visited_at: string;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export type PageView = {
  id: number;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  city: string | null;
  created_at: string;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
