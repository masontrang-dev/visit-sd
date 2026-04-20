import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RestaurantDetailClient from "./RestaurantDetailClient";

type Params = Promise<{ id: string }>;

async function fetchRestaurantMeta(id: number) {
  // Use the anon-key client here — generateMetadata runs during static/ISR
  // rendering where cookies() would make the route dynamic. Per-user
  // visibility checks stay on the client component.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase
    .from("restaurants")
    .select("id, name, cuisine, neighborhood, price, must_try")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return { title: "Restaurant not found · VISIT SD" };

  const restaurant = await fetchRestaurantMeta(parsed);
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

  const restaurant = await fetchRestaurantMeta(parsed);
  if (!restaurant) notFound();

  return <RestaurantDetailClient params={params} />;
}
