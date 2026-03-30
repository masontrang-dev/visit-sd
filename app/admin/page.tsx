"use client";

import { useEffect, useState } from "react";
import { supabase, type Restaurant, type PageView } from "@/lib/supabase";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar from "@/components/FilterBar";
import AddModal from "@/components/AddModal";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [opError, setOpError] = useState("");
  const [mustTryFilter, setMustTryFilter] = useState(false);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("all");
  const [showStats, setShowStats] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [totalViews, setTotalViews] = useState(0);
  const [viewsByDay, setViewsByDay] = useState<
    { date: string; count: number }[]
  >([]);
  const [topReferrers, setTopReferrers] = useState<
    { referrer: string; count: number }[]
  >([]);

  async function loadStats() {
    setStatsLoading(true);
    const { data, error } = await supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setTotalViews(data.length);

      // Views per day (last 30 days)
      const dayCounts: Record<string, number> = {};
      data.forEach((row: PageView) => {
        const day = row.created_at.slice(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const sorted = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
      setViewsByDay(sorted);

      // Top referrers
      const refCounts: Record<string, number> = {};
      data.forEach((row: PageView) => {
        const ref = row.referrer || "(direct)";
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      });
      const topRefs = Object.entries(refCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopReferrers(topRefs);
    }
    setStatsLoading(false);
  }

  async function cleanupOldViews() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await supabase
      .from("page_views")
      .delete()
      .lt("created_at", cutoff.toISOString());
    loadStats();
  }

  function checkPassword() {
    if (pwInput === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true);
      loadData();
    } else {
      setPwError(true);
    }
  }

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("cuisine")
      .order("name");
    setRestaurants(data ?? []);
    setLoading(false);
  }

  async function handleAdd(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    setOpError("");
    const { error } = await supabase.from("restaurants").insert([entry]);
    if (error) {
      setOpError("Failed to add restaurant.");
      return false;
    }
    loadData();
    return true;
  }

  async function handleEdit(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    if (!editingRestaurant) return false;
    setOpError("");
    const { error } = await supabase
      .from("restaurants")
      .update(entry)
      .eq("id", editingRestaurant.id);
    if (error) {
      setOpError("Failed to update restaurant.");
      return false;
    }
    loadData();
    return true;
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this restaurant?")) return;
    setDeletingId(id);
    setOpError("");
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      setOpError("Failed to delete restaurant.");
      return;
    }
    loadData();
  }

  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const neighborhoods = Array.from(
    new Set(restaurants.map((r) => r.neighborhood).filter(Boolean)),
  ).sort();
  const filtered = restaurants.filter((r) => {
    if (activeFilter !== "all" && r.cuisine !== activeFilter) return false;
    if (neighborhoodFilter !== "all" && r.neighborhood !== neighborhoodFilter)
      return false;
    if (mustTryFilter && !r.must_try) return false;
    return true;
  });

  if (!authed) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              marginBottom: 8,
            }}
          >
            ADMIN
          </p>
          <p style={{ color: "var(--txt2)", fontSize: 14, marginBottom: 24 }}>
            Enter your admin password to manage restaurants.
          </p>
          <input
            type="password"
            placeholder="Password"
            value={pwInput}
            onChange={(e) => {
              setPwInput(e.target.value);
              setPwError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && checkPassword()}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: 15,
              border: `1.5px solid ${pwError ? "var(--accent)" : "var(--brd)"}`,
              background: "var(--bg)",
              color: "var(--txt)",
              borderRadius: 0,
              outline: "none",
              fontFamily: "var(--font-body)",
              marginBottom: 8,
            }}
          />
          {pwError && (
            <p
              style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12 }}
            >
              Incorrect password
            </p>
          )}
          <button
            onClick={checkPassword}
            style={{
              width: "100%",
              padding: 10,
              background: "var(--txt)",
              color: "var(--bg)",
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              borderRadius: 0,
            }}
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh" }}>
      <header
        style={{
          padding: "2.5rem 1.5rem 1.5rem",
          borderBottom: "2px solid var(--txt)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Admin · San Diego
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px,10vw,80px)",
            lineHeight: 0.88,
          }}
        >
          MANAGE
          <br />
          <span style={{ color: "var(--accent)" }}>SPOTS</span>
        </h1>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: 20,
              border: "1.5px solid var(--txt)",
            }}
          >
            {restaurants.length} spots
          </span>
          <a
            href="/"
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: 20,
              border: "1.5px solid var(--brd)",
              color: "var(--txt2)",
              textDecoration: "none",
            }}
          >
            ← Public view
          </a>
        </div>
      </header>

      <FilterBar
        cuisines={cuisines}
        active={activeFilter}
        onChange={setActiveFilter}
        neighborhoods={neighborhoods}
        activeNeighborhood={neighborhoodFilter}
        onNeighborhoodChange={setNeighborhoodFilter}
        onAdd={() => {
          setEditingRestaurant(null);
          setShowModal(true);
        }}
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={setMustTryFilter}
      />

      {opError && (
        <p
          style={{
            padding: "0.75rem 1.5rem",
            color: "var(--accent)",
            fontSize: 13,
          }}
        >
          {opError}
        </p>
      )}

      {loading ? (
        <p style={{ padding: "3rem 1.5rem", color: "var(--txt2)" }}>
          Loading...
        </p>
      ) : (
        <RestaurantGrid
          restaurants={filtered}
          grouped={
            activeFilter === "all" &&
            neighborhoodFilter === "all" &&
            !mustTryFilter
          }
          onDelete={handleDelete}
          deletingId={deletingId}
          onEdit={(r) => {
            setEditingRestaurant(r);
            setShowModal(true);
          }}
        />
      )}

      {/* Stats Section */}
      <section
        style={{
          borderTop: "2px solid var(--txt)",
          padding: "1.5rem",
        }}
      >
        <button
          onClick={() => {
            setShowStats(!showStats);
            if (!showStats) loadStats();
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--txt)",
            padding: 0,
            letterSpacing: "0.04em",
          }}
        >
          {showStats ? "▾ STATS" : "▸ STATS"}
        </button>

        {showStats && (
          <div style={{ marginTop: "1rem" }}>
            {statsLoading ? (
              <p style={{ color: "var(--txt2)", fontSize: 14 }}>
                Loading stats...
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      border: "1.5px solid var(--brd)",
                      minWidth: 140,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                        color: "var(--txt2)",
                        marginBottom: 4,
                      }}
                    >
                      Total views
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 36,
                      }}
                    >
                      {totalViews}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      border: "1.5px solid var(--brd)",
                      minWidth: 140,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                        color: "var(--txt2)",
                        marginBottom: 4,
                      }}
                    >
                      Today
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 36,
                      }}
                    >
                      {viewsByDay.length > 0
                        ? viewsByDay[viewsByDay.length - 1].date ===
                          new Date().toISOString().slice(0, 10)
                          ? viewsByDay[viewsByDay.length - 1].count
                          : 0
                        : 0}
                    </p>
                  </div>
                </div>

                {/* Views per day bar chart */}
                {viewsByDay.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <p
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                        color: "var(--txt2)",
                        marginBottom: 8,
                      }}
                    >
                      Views per day (last 30 days)
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 2,
                        height: 80,
                        borderBottom: "1px solid var(--brd)",
                        paddingBottom: 4,
                      }}
                    >
                      {viewsByDay.map((d) => {
                        const max = Math.max(...viewsByDay.map((v) => v.count));
                        const h = max > 0 ? (d.count / max) * 70 : 0;
                        return (
                          <div
                            key={d.date}
                            title={`${d.date}: ${d.count}`}
                            style={{
                              flex: 1,
                              height: Math.max(h, 2),
                              background: "var(--accent)",
                              borderRadius: "2px 2px 0 0",
                              minWidth: 4,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top referrers */}
                {topReferrers.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <p
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                        color: "var(--txt2)",
                        marginBottom: 8,
                      }}
                    >
                      Top referrers
                    </p>
                    {topReferrers.map((ref) => (
                      <div
                        key={ref.referrer}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 0",
                          borderBottom: "0.5px solid var(--brd)",
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--txt2)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "80%",
                          }}
                        >
                          {ref.referrer}
                        </span>
                        <span style={{ fontWeight: 500 }}>{ref.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={cleanupOldViews}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "1.5px solid var(--brd)",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--txt2)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Delete views older than 90 days
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {showModal && (
        <AddModal
          onSave={editingRestaurant ? handleEdit : handleAdd}
          onClose={() => {
            setShowModal(false);
            setEditingRestaurant(null);
          }}
          editData={editingRestaurant}
        />
      )}
    </main>
  );
}
