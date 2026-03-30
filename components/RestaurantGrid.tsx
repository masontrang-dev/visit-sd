"use client";

import { type Restaurant } from "@/lib/supabase";

type Props = {
  restaurants: Restaurant[];
  grouped: boolean;
  onDelete?: (id: number) => void;
  deletingId?: number | null;
};

function Card({
  r,
  onDelete,
  deletingId,
}: {
  r: Restaurant;
  onDelete?: (id: number) => void;
  deletingId?: number | null;
}) {
  return (
    <div
      style={{
        background: "var(--bg)",
        padding: "1.25rem",
        position: "relative",
        borderBottom: "0.5px solid var(--brd)",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
    >
      <p
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: "var(--accent)",
          marginBottom: 4,
        }}
      >
        {r.cuisine}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          lineHeight: 1,
          color: "var(--txt)",
          marginBottom: 4,
        }}
      >
        {r.name}
      </p>
      <p
        style={
          {
            fontSize: 13,
            color: "var(--txt2)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          } as React.CSSProperties
        }
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent2)",
            flexShrink: 0,
          }}
        />
        {r.neighborhood}
      </p>
      <p
        style={{
          position: "absolute",
          top: "1.25rem",
          right: "1.25rem",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--txt2)",
        }}
      >
        {r.price}
      </p>
      {r.note && (
        <p
          style={{
            marginTop: 10,
            fontSize: 13,
            color: "var(--txt2)",
            lineHeight: 1.5,
            borderTop: "0.5px solid var(--brd)",
            paddingTop: 10,
            fontStyle: "italic",
          }}
        >
          {r.note}
        </p>
      )}
      {r.added_by && (
        <p
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "var(--txt2)",
            letterSpacing: "0.05em",
          }}
        >
          Added by {r.added_by}
        </p>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(r.id)}
          disabled={deletingId === r.id}
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            cursor: deletingId === r.id ? "default" : "pointer",
            fontSize: 14,
            color: "var(--accent)",
            fontFamily: "var(--font-body)",
            opacity: deletingId === r.id ? 0.3 : 0.6,
            padding: 0,
          }}
          title="Remove"
        >
          {deletingId === r.id ? "Removing..." : "Remove"}
        </button>
      )}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 0,
  background: "var(--brd)",
  borderLeft: "0.5px solid var(--brd)",
};

export default function RestaurantGrid({
  restaurants,
  grouped,
  onDelete,
  deletingId,
}: Props) {
  if (restaurants.length === 0) {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 48,
            color: "var(--brd)",
            marginBottom: 12,
          }}
        >
          NO SPOTS YET
        </p>
        <p style={{ color: "var(--txt2)", fontSize: 15 }}>
          {grouped
            ? "Add your first recommendation"
            : "No spots in this category"}
        </p>
      </div>
    );
  }

  if (!grouped) {
    return (
      <div style={gridStyle}>
        {restaurants.map((r) => (
          <Card key={r.id} r={r} onDelete={onDelete} deletingId={deletingId} />
        ))}
      </div>
    );
  }

  const byCuisine: Record<string, Restaurant[]> = {};
  restaurants.forEach((r) => {
    const c = r.cuisine || "Other";
    if (!byCuisine[c]) byCuisine[c] = [];
    byCuisine[c].push(r);
  });

  return (
    <>
      {Object.keys(byCuisine)
        .sort()
        .map((cuisine, i) => (
          <section key={cuisine}>
            <div
              style={{
                padding: "1rem 1.5rem 0.5rem",
                borderTop: i === 0 ? "none" : "2px solid var(--txt)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  letterSpacing: "0.04em",
                }}
              >
                {cuisine}
              </span>
              <span
                style={{ fontSize: 13, color: "var(--txt2)", marginLeft: 10 }}
              >
                {byCuisine[cuisine].length} spot
                {byCuisine[cuisine].length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={gridStyle}>
              {byCuisine[cuisine].map((r) => (
                <Card
                  key={r.id}
                  r={r}
                  onDelete={onDelete}
                  deletingId={deletingId}
                />
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
