"use client";

import {
  createContext,
  useContext,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  ItemOrder,
  MenuItem,
  Restaurant,
  RestaurantVisit,
} from "@/lib/supabase";

type Value = {
  restaurant: Restaurant;
  visits: RestaurantVisit[];
  cuisineColor: string;
  isScrolled: boolean;
  hasScrolled: MutableRefObject<boolean>;
  superuserNames: string[];
  adminNames: string[];
  visitingId: number | null;
  canCheckIn: boolean;
  deletingVisitId: number | null;
  showVisitHistory: boolean;
  setShowVisitHistory: Dispatch<SetStateAction<boolean>>;
  setShowCheckInModal: Dispatch<SetStateAction<boolean>>;
  setShowOrderModal: Dispatch<SetStateAction<boolean>>;
  setShowDeleteVisitConfirm: Dispatch<SetStateAction<number | null>>;
  setEditingOrder: Dispatch<SetStateAction<ItemOrder | null>>;
  setEditingMenuItem: Dispatch<SetStateAction<MenuItem | null>>;
};

const RestaurantDetailContext = createContext<Value | null>(null);

export function RestaurantDetailProvider({
  value,
  children,
}: {
  value: Value;
  children: ReactNode;
}) {
  return (
    <RestaurantDetailContext.Provider value={value}>
      {children}
    </RestaurantDetailContext.Provider>
  );
}

export function useRestaurantDetail(): Value {
  const ctx = useContext(RestaurantDetailContext);
  if (!ctx) {
    throw new Error(
      "useRestaurantDetail must be used within RestaurantDetailProvider",
    );
  }
  return ctx;
}
