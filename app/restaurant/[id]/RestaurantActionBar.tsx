"use client";

import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { trackEvent } from "@/lib/analytics";
import WishlistToggle from "@/components/WishlistToggle";
import { useRestaurantDetail } from "./RestaurantDetailContext";

export default function RestaurantActionBar() {
  const { displayName, canManageContent } = useAuth();
  const { toast } = useToast();
  const {
    restaurant,
    visitingId,
    canCheckIn,
    setShowCheckInModal,
    setShowOrderModal,
    setEditingOrder,
    setEditingMenuItem,
  } = useRestaurantDetail();

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: restaurant.name,
          text: `Check out ${restaurant.name} on Visit SD`,
          url,
        })
        .catch(() => {
          navigator.clipboard.writeText(url);
          toast("Link copied to clipboard", "success");
        });
    } else {
      navigator.clipboard.writeText(url);
      toast("Link copied to clipboard", "success");
    }
  }

  // Sharp corners + reliable 44px touch target on every control.
  const baseBtn =
    "min-h-[44px] py-3 px-4 text-sm font-medium text-center rounded-none transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

  const checkedIn = !canCheckIn;
  const checkingIn = visitingId === restaurant.id;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-bg border-t-[1.5px] border-txt px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 shadow-lg"
    >
      <div className="max-w-4xl mx-auto flex gap-2 items-stretch">
        {restaurant.google_maps_url ? (
          <a
            href={restaurant.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("outbound_click", "google_maps")}
            className={`${baseBtn} flex-1 bg-accent text-white no-underline hover:opacity-90 flex items-center justify-center gap-1.5`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Maps</span>
          </a>
        ) : (
          <button
            disabled
            className={`${baseBtn} flex-1 bg-brd text-txt2 cursor-not-allowed`}
          >
            Maps
          </button>
        )}
        {displayName && (
          <button
            onClick={() => setShowCheckInModal(true)}
            disabled={checkingIn || checkedIn}
            className={`${baseBtn} flex-1 ${
              checkingIn || checkedIn
                ? "bg-txt2 text-white cursor-not-allowed opacity-50"
                : "bg-accent2 text-white hover:opacity-90"
            }`}
          >
            {checkingIn ? "..." : checkedIn ? "✓ Checked in" : "Check in"}
          </button>
        )}
        {canManageContent && (
          <button
            onClick={() => {
              setEditingOrder(null);
              setEditingMenuItem(null);
              setShowOrderModal(true);
            }}
            className={`${baseBtn} flex-1 bg-accent text-white hover:opacity-90 hidden sm:inline-flex items-center justify-center`}
          >
            Log order
          </button>
        )}
        <div className="shrink-0 flex items-center">
          <WishlistToggle restaurantId={restaurant.id} variant="icon" />
        </div>
        <button
          onClick={handleShare}
          className={`${baseBtn} shrink-0 w-11 bg-bg2 text-txt border-[1.5px] border-brd hover:border-txt inline-flex items-center justify-center`}
          aria-label="Share"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
      {canManageContent && (
        <div className="max-w-4xl mx-auto mt-2 sm:hidden">
          <button
            onClick={() => {
              setEditingOrder(null);
              setEditingMenuItem(null);
              setShowOrderModal(true);
            }}
            className={`${baseBtn} w-full bg-accent text-white hover:opacity-90`}
          >
            Log order
          </button>
        </div>
      )}
    </div>
  );
}
