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

export type MenuItem = {
  id: number;
  restaurant_id: number;
  name: string;
  category: string | null;
  description: string | null;
  is_recommended: boolean;
  created_at: string;
};

export type DrinkDetails = {
  sweetness?: {
    style: "descriptive" | "percentage";
    value: number;
    label: string;
  };
  ice?: {
    style: "descriptive" | "percentage";
    value: number;
    label: string;
  };
  size?: string | null;
  temperature?: string | null;
  toppings?: string[] | null;
  milk_type?: string | null;
  shots?: number | null;
};

export type ItemOrder = {
  id: number;
  menu_item_id: number;
  restaurant_id: number;
  ordered_at: string;
  rating: number | null;
  notes: string | null;
  photo_url: string | null;
  drink_details: DrinkDetails | null;
  created_at: string;
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
  ip_address: string | null;
  country: string | null;
  region: string | null;
  device_type: string | null;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
