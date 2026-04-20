"use client";

import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { trackEvent } from "@/lib/analytics";
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg border-t-2 border-txt p-4 z-40">
      <div className="max-w-4xl mx-auto flex gap-3">
        {restaurant.google_maps_url ? (
          <a
            href={restaurant.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("outbound_click", "google_maps")}
            className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center bg-accent text-white no-underline transition-opacity hover:opacity-90"
          >
            View on Maps
          </a>
        ) : (
          <button
            disabled
            className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center bg-brd text-txt2 cursor-not-allowed"
          >
            View on Maps
          </button>
        )}
        {displayName && (
          <button
            onClick={() => setShowCheckInModal(true)}
            disabled={visitingId === restaurant.id || !canCheckIn}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center transition-opacity ${
              visitingId === restaurant.id || !canCheckIn
                ? "bg-txt2 text-white cursor-not-allowed opacity-50"
                : "bg-accent2 text-white hover:opacity-90"
            }`}
          >
            {visitingId === restaurant.id
              ? "Checking in..."
              : !canCheckIn
                ? "✓ Checked In"
                : "Check in"}
          </button>
        )}
        {canManageContent && (
          <button
            onClick={() => {
              setEditingOrder(null);
              setEditingMenuItem(null);
              setShowOrderModal(true);
            }}
            className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center bg-accent text-white transition-opacity hover:opacity-90"
          >
            Log order
          </button>
        )}
        <button
          onClick={handleShare}
          className="py-3 px-4 rounded-lg text-sm font-medium text-center bg-bg2 text-txt border-[1.5px] border-brd transition-colors hover:border-txt"
          aria-label="Share"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
    </div>
  );
}
