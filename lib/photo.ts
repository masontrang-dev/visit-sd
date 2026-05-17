/**
 * True if `url` is hosted on Supabase Storage. Lets render sites opt in to
 * Next/Image optimization only for hostnames listed in next.config.js
 * `remotePatterns` — any other origin (legacy Google Places photos that
 * predate the migration) must stay `unoptimized` to avoid runtime errors.
 */
export function isSupabaseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https:\/\/[^/]+\.supabase\.co\//.test(url);
}
