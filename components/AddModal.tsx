"use client";

import { useState } from "react";
import { type Restaurant } from "@/lib/supabase";

type Props = {
  onSave: (entry: Omit<Restaurant, "id" | "created_at">) => Promise<boolean>;
  onClose: () => void;
};

const PRICES = ["$", "$$", "$$$", "$$$$"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 15,
  border: "1.5px solid var(--brd)",
  background: "var(--bg)",
  color: "var(--txt)",
  borderRadius: 0,
  outline: "none",
  fontFamily: "var(--font-body)",
  transition: "border-color 0.12s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: "var(--txt2)",
  marginBottom: 5,
};

const ADMIN_NAMES = (process.env.NEXT_PUBLIC_ADMIN_NAMES ?? "")
  .split(",")
  .filter(Boolean);

export default function AddModal({ onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [price, setPrice] = useState("$$$");
  const [note, setNote] = useState("");
  const [addedBy, setAddedBy] = useState(ADMIN_NAMES[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    const ok = await onSave({
      name: name.trim(),
      neighborhood: neighborhood.trim(),
      cuisine: cuisine.trim(),
      price,
      note: note.trim(),
      added_by: addedBy || null,
      address: null,
      google_maps_url: null,
      place_id: null,
      lat: null,
      lng: null,
      photo_url: null,
      must_try: false,
    });
    setSaving(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    } else {
      setError("Failed to save — please try again.");
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          border: "2px solid var(--txt)",
          padding: "1.75rem",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 36,
            marginBottom: "1.25rem",
          }}
        >
          {success ? "Spot added!" : "Add a spot"}
        </p>

        {success && (
          <p
            style={{
              color: "var(--accent)",
              fontSize: 14,
              marginBottom: "1rem",
            }}
          >
            Restaurant saved successfully.
          </p>
        )}

        {[
          {
            label: "Restaurant name",
            value: name,
            set: setName,
            placeholder: "e.g. Juniper & Ivy",
          },
          {
            label: "Neighborhood",
            value: neighborhood,
            set: setNeighborhood,
            placeholder: "e.g. Little Italy, North Park...",
          },
          {
            label: "Cuisine type",
            value: cuisine,
            set: setCuisine,
            placeholder: "e.g. Mexican, Seafood, Italian...",
          },
        ].map((field) => (
          <div key={field.label} style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>{field.label}</label>
            <input
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder={field.placeholder}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--brd)")}
            />
          </div>
        ))}

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Price range</label>
          <div style={{ display: "flex", gap: 8 }}>
            {PRICES.map((p) => (
              <button
                key={p}
                onClick={() => setPrice(p)}
                style={{
                  flex: 1,
                  padding: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "1.5px solid var(--brd)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  borderRadius: 0,
                  background: price === p ? "var(--txt)" : "transparent",
                  color: price === p ? "var(--bg)" : "var(--txt2)",
                  borderColor: price === p ? "var(--txt)" : "var(--brd)",
                  transition: "all 0.12s",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {ADMIN_NAMES.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Added by</label>
            <select
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {ADMIN_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Why you love it</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What makes this place special?"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--brd)")}
          />
        </div>

        {error && (
          <p style={{ color: "var(--accent)", fontSize: 13, marginBottom: 8 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: "1.5rem" }}>
          <button
            onClick={handleSave}
            disabled={saving || success}
            style={{
              flex: 1,
              padding: 10,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: saving || success ? "default" : "pointer",
              fontFamily: "var(--font-body)",
              borderRadius: 0,
              opacity: saving || success ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : success ? "Saved!" : "Save restaurant"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px",
              background: "transparent",
              color: "var(--txt2)",
              border: "1.5px solid var(--brd)",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              borderRadius: 0,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
