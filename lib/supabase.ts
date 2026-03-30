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
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
