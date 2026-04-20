"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import WishlistButton from "./WishlistButton";
import { useToast } from "./Toast";

type Props = {
  restaurantId: number;
  variant?: "icon" | "pill";
  size?: "sm" | "md";
};

export default function WishlistToggle({
  restaurantId,
  variant = "pill",
  size = "md",
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setActive(false);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!cancelled) {
        setActive(!!data);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, restaurantId]);

  const onToggle = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast("Sign in to save places", "error");
      return active;
    }
    if (active) {
      const { error } = await supabase
        .from("user_wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("restaurant_id", restaurantId);
      if (error) {
        toast("Couldn't remove from wishlist", "error");
        return active;
      }
      setActive(false);
      return false;
    }
    const { error } = await supabase
      .from("user_wishlist")
      .insert({ user_id: user.id, restaurant_id: restaurantId });
    if (error) {
      toast("Couldn't save to wishlist", "error");
      return active;
    }
    setActive(true);
    toast("Added to wishlist", "success");
    return true;
  }, [active, restaurantId, toast, user]);

  if (!user) return null;

  return (
    <WishlistButton
      active={active}
      onToggle={onToggle}
      disabled={!loaded}
      variant={variant}
      size={size}
    />
  );
}
