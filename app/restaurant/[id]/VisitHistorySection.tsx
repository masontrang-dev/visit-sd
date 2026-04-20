"use client";

import { useAuth } from "@/lib/auth-context";
import IllustrationNoVisits from "@/components/IllustrationNoVisits";
import { formatDisplayName } from "@/lib/utils";
import { useRestaurantDetail } from "./RestaurantDetailContext";
import { formatDate, formatTime } from "./formatters";

function Chevron({
  open,
  className = "",
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-90" : ""} ${className}`}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function VisitHistorySection() {
  const { isAdmin, isSuperuser, displayName } = useAuth();
  const {
    restaurant,
    visits,
    superuserNames,
    adminNames,
    deletingVisitId,
    showVisitHistory,
    setShowVisitHistory,
    setShowDeleteVisitConfirm,
  } = useRestaurantDetail();

  return (
    <div className="p-6 border-t border-brd scroll-fade-in">
      <button
        onClick={() => setShowVisitHistory((v) => !v)}
        className="w-full flex items-center justify-between gap-3 bg-transparent border-none cursor-pointer p-0 text-left"
      >
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <h2 className="font-display text-xl tracking-tight">Visit History</h2>
          <span className="text-sm text-txt2">
            {visits.length} {visits.length === 1 ? "visit" : "visits"}
            {restaurant.last_visited &&
              ` · last ${formatDate(restaurant.last_visited)}`}
          </span>
        </div>
        <Chevron open={showVisitHistory} className="text-txt2 shrink-0" />
      </button>

      {showVisitHistory && (
        <div className="mt-4">
          {visits.length === 0 ? (
            <div className="py-4 text-center">
              <IllustrationNoVisits className="mx-auto mb-1" />
              <p className="text-sm text-txt2">No visits recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => {
                const canDelete =
                  isSuperuser ||
                  (isAdmin && visit.visited_by === displayName) ||
                  (isAdmin &&
                    !superuserNames.includes(visit.visited_by) &&
                    !adminNames.includes(visit.visited_by));
                return (
                  <div
                    key={visit.id}
                    className="flex items-start justify-between gap-3 pb-3 border-b border-brd last:border-0"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-accent2 shrink-0 mt-1.5" />
                      <div className="flex-1">
                        <p className="text-sm text-txt font-medium">
                          {formatDate(visit.visited_at)} at{" "}
                          {formatTime(visit.visited_at)}
                        </p>
                        <p className="text-xs text-txt2">
                          by {formatDisplayName(visit.visited_by)}
                        </p>
                        {visit.note && (
                          <p className="text-xs text-txt2 mt-1.5 italic">
                            &ldquo;{visit.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => setShowDeleteVisitConfirm(visit.id)}
                        disabled={deletingVisitId === visit.id}
                        className="text-xs text-txt2 hover:text-error transition-colors shrink-0"
                      >
                        {deletingVisitId === visit.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
