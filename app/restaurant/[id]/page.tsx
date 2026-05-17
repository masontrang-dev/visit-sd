import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Restaurant } from "@/lib/supabase";
import RestaurantDetailClient from "./RestaurantDetailClient";

type Params = Promise<{ id: string }>;

// Pre-render every public restaurant page at build time; refresh each one at
// most every hour. Private/archived rows are excluded so they don't ship as
// static HTML to search crawlers or anon users.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("visibility", "public");
  return (data ?? []).map((r: { id: number }) => ({ id: String(r.id) }));
}

const fetchRestaurant = cache(
  async (id: number): Promise<Restaurant | null> => {
    // Use the anon-key client here — generateMetadata runs during static/ISR
    // rendering where cookies() would make the route dynamic. Per-user
    // visibility checks stay on the client component.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .single();
    return (data as Restaurant) ?? null;
  },
);

function priceToRange(price: string | null): string | undefined {
  if (!price) return undefined;
  // Schema.org accepts "$", "$$", "$$$", "$$$$"
  return price;
}

function buildRestaurantJsonLd(r: Restaurant) {
  const image = [r.photo_url, r.storefront_photo_url].filter(Boolean);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.name,
    ...(r.cuisine ? { servesCuisine: r.cuisine } : {}),
    ...(image.length ? { image } : {}),
    ...(r.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: r.address,
            addressLocality: "San Diego",
            addressRegion: "CA",
            addressCountry: "US",
          },
        }
      : {}),
    ...(r.lat != null && r.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: r.lat,
            longitude: r.lng,
          },
        }
      : {}),
    ...(priceToRange(r.price) ? { priceRange: priceToRange(r.price) } : {}),
    ...(r.google_rating != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: r.google_rating,
            ...(r.google_review_count != null
              ? { reviewCount: r.google_review_count }
              : {}),
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(r.google_maps_url ? { sameAs: [r.google_maps_url] } : {}),
  };
  return jsonLd;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return { title: "Restaurant not found · VISIT SD" };

  const restaurant = await fetchRestaurant(parsed);
  if (!restaurant) return { title: "Restaurant not found · VISIT SD" };

  const parts = [
    restaurant.cuisine,
    restaurant.neighborhood,
    restaurant.price,
  ].filter(Boolean);
  const subtitle = parts.join(" · ");
  const description =
    subtitle ||
    `A San Diego spot worth visiting${
      restaurant.must_try ? " — marked must-try" : ""
    }.`;

  const title = `${restaurant.name}${subtitle ? ` — ${subtitle}` : ""} · VISIT SD`;

  return {
    title,
    description,
    alternates: {
      canonical: `/restaurant/${restaurant.id}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) notFound();

  const restaurant = await fetchRestaurant(parsed);
  if (!restaurant) notFound();

  // Only emit JSON-LD for publicly visible restaurants — hides private/archived
  // spots from search indexing.
  const isPublic = (restaurant.visibility ?? "public") === "public";
  const jsonLd = isPublic ? buildRestaurantJsonLd(restaurant) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <RestaurantDetailClient params={params} initialRestaurant={restaurant} />
    </>
  );
}
