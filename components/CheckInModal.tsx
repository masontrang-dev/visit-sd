"use client";

import { useState } from "react";

type CheckInModalProps = {
  restaurantName: string;
  onConfirm: (
    visitDate: string,
    shouldLogOrder: boolean,
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
  const [note, setNote] = useState("");

  function handleConfirm(logOrder: boolean) {
    const selectedDate = new Date(visitDateTime);
    onConfirm(selectedDate.toISOString(), logOrder, note);
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
            className="w-full px-3 py-3 border-[1.5px] border-brd bg-bg text-txt focus:outline-none focus:border-accent transition-colors cursor-pointer hover:border-txt [color-scheme:light] dark:[color-scheme:dark]"
          />
          <p className="text-2xs text-txt2 mt-1.5 opacity-60">
            Click to adjust date and time
          </p>
        </div>

        <div className="mb-6">
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
            className="input-base"
          />
        </div>

        <div className="space-y-2">
          {isAdmin && (
            <button
              onClick={() => handleConfirm(true)}
              className="w-full py-3 px-4 bg-accent text-white text-sm font-medium border-2 border-accent transition-all hover:opacity-90"
            >
              Check in & log order →
            </button>
          )}
          <button
            onClick={() => handleConfirm(false)}
            className={`w-full py-3 px-4 text-sm font-medium border-2 transition-all hover:opacity-90 ${
              isAdmin
                ? "bg-transparent text-txt border-txt"
                : "bg-accent text-white border-accent"
            }`}
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
