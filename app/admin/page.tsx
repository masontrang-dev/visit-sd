"use client";

import { useEffect, useState } from "react";
import { supabase, type Restaurant } from "@/lib/supabase";
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
  const filtered = restaurants.filter((r) => {
    if (activeFilter !== "all" && r.cuisine !== activeFilter) return false;
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
          grouped={activeFilter === "all" && !mustTryFilter}
          onDelete={handleDelete}
          deletingId={deletingId}
          onEdit={(r) => {
            setEditingRestaurant(r);
            setShowModal(true);
          }}
        />
      )}

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
