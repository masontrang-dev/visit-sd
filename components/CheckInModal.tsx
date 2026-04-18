"use client";

import { useState } from "react";

type CheckInModalProps = {
  restaurantName: string;
  onConfirm: (
    visitDate: string,
    shouldLogOrder: boolean,
    rating?: number | null,
    note?: string,
  ) => void;
  onClose: () => void;
  isAdmin?: boolean;
};

export default function CheckInModal({
  restaurantName,
  onConfirm,
  onClose,
  isAdmin = false,
}: CheckInModalProps) {
  const now = new Date();
  const localDateTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);

  const [visitDateTime, setVisitDateTime] = useState(localDateTime);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");

  function handleConfirm(logOrder: boolean) {
    // Convert local datetime back to ISO string
    const selectedDate = new Date(visitDateTime);
    onConfirm(selectedDate.toISOString(), logOrder, rating, note);
  }

  return (
    <div
      className="fixed inset-0 bg-txt/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg border-2 border-txt max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-4xl mb-4 tracking-tight">Check In</h2>
        <p className="text-sm text-txt2 mb-6">
          Log your visit to{" "}
          <span className="font-medium text-txt">{restaurantName}</span>
        </p>

        {/* Date/Time Picker - Always visible with default value */}
        <div className="mb-6">
          <label
            htmlFor="visit-datetime"
            className="block text-xs uppercase tracking-wide text-txt2 mb-2 font-medium"
          >
            Visit Date & Time
          </label>
          <input
            id="visit-datetime"
            type="datetime-local"
            value={visitDateTime}
            onChange={(e) => setVisitDateTime(e.target.value)}
            className="w-full px-3 py-3 border-[1.5px] border-brd bg-bg text-txt text-base focus:outline-none focus:border-accent transition-colors cursor-pointer hover:border-txt [color-scheme:light] dark:[color-scheme:dark]"
          />
          <p className="text-2xs text-txt2 mt-1.5 opacity-60">
            Click to adjust date and time
          </p>
        </div>

        {/* Rating Section */}
        <div className="mb-6">
          {!showRating ? (
            <button
              onClick={() => setShowRating(true)}
              className="w-full py-2 px-4 bg-transparent text-txt2 text-sm transition-opacity hover:opacity-70"
            >
              + Add rating/notes
            </button>
          ) : (
            <div>
              <label className="block text-xs uppercase tracking-wide text-txt2 mb-2 font-medium">
                Rating (Optional)
              </label>
              <div className="flex gap-1 items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(rating === star ? null : star)}
                    className={`text-2xl bg-transparent border-none cursor-pointer p-1 transition-colors duration-[0.12s] ${
                      rating !== null && star <= rating
                        ? "text-accent"
                        : "text-brd"
                    }`}
                  >
                    ★
                  </button>
                ))}
                {rating && (
                  <span className="text-sm text-txt2 ml-2">{rating}/5</span>
                )}
              </div>
              <div>
                <label
                  htmlFor="visit-note"
                  className="block text-xs uppercase tracking-wide text-txt2 mb-2 font-medium"
                >
                  Note (Optional)
                </label>
                <input
                  id="visit-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a quick note about your visit..."
                  className="w-full px-3 py-2 border-[1.5px] border-brd bg-bg text-txt text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <p className="text-2xs text-txt2 mt-1.5 opacity-60">
                You can skip rating and check in
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => handleConfirm(false)}
            className="w-full py-3 px-4 bg-accent text-white text-sm font-medium border-2 border-accent transition-all hover:opacity-90"
          >
            Check In
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-transparent text-txt2 text-sm transition-opacity hover:opacity-70"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
