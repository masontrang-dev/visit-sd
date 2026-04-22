"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase, type Restaurant } from "@/lib/supabase";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";

type Visibility = "public" | "private" | "archived";

const VISIBILITY_VALUES: Visibility[] = ["public", "private", "archived"];

const CSV_COLUMNS: {
  key: keyof Restaurant;
  label: string;
}[] = [
  { key: "id", label: "id" },
  { key: "name", label: "name" },
  { key: "cuisine", label: "cuisine" },
  { key: "neighborhood", label: "neighborhood" },
  { key: "price", label: "price" },
  { key: "address", label: "address" },
  { key: "google_maps_url", label: "google_maps_url" },
  { key: "google_rating", label: "google_rating" },
  { key: "google_review_count", label: "google_review_count" },
  { key: "must_try", label: "must_try" },
  { key: "visibility", label: "visibility" },
  { key: "last_visited", label: "last_visited" },
  { key: "date_added", label: "date_added" },
  { key: "created_at", label: "created_at" },
];

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = Array.isArray(value) ? value.join("|") : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildCsv(rows: Restaurant[]): string {
  const header = CSV_COLUMNS.map((c) => c.label).join(",");
  const body = rows
    .map((r) =>
      CSV_COLUMNS.map((c) => escapeCsv(r[c.key] as unknown)).join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminRestaurantsPage() {
  const { isAdmin, isSuperuser, isLoading: authLoading } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [visibilityTarget, setVisibilityTarget] =
    useState<Visibility>("public");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<Visibility | "all">(
    "all",
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (!authLoading && isAdmin) {
      load();
    }
  }, [authLoading, isAdmin]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("name");
    if (error) {
      setMessage({ kind: "error", text: `Load failed: ${error.message}` });
      setRestaurants([]);
    } else {
      setRestaurants((data ?? []) as Restaurant[]);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (visibilityFilter !== "all") {
        if ((r.visibility ?? "public") !== visibilityFilter) return false;
      }
      if (!q) return true;
      const hay = [r.name, r.cuisine, r.neighborhood, r.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [restaurants, search, visibilityFilter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((r) => next.delete(r.id));
      } else {
        filtered.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function applyBulkVisibility() {
    if (selectedIds.size === 0) {
      setMessage({ kind: "error", text: "No rows selected." });
      return;
    }
    setWorking(true);
    setMessage(null);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("restaurants")
      .update({
        visibility: visibilityTarget,
        visibility_changed_at: new Date().toISOString(),
      })
      .in("id", ids);
    if (error) {
      setMessage({ kind: "error", text: `Update failed: ${error.message}` });
    } else {
      setMessage({
        kind: "success",
        text: `Updated ${ids.length} restaurant${ids.length === 1 ? "" : "s"} to "${visibilityTarget}".`,
      });
      await load();
    }
    setWorking(false);
  }

  async function hardDeleteSelected() {
    if (!isSuperuser) return;
    if (selectedIds.size === 0) return;
    setWorking(true);
    setMessage(null);
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/admin/delete-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data.error || "Hard delete failed.",
        });
      } else {
        const n: number = data.deleted ?? ids.length;
        setMessage({
          kind: "success",
          text: `Hard-deleted ${n} restaurant${n === 1 ? "" : "s"}.`,
        });
        clearSelection();
        await load();
      }
    } catch (err) {
      console.error("[admin/restaurants] hardDeleteSelected:", err);
      setMessage({ kind: "error", text: "Hard delete failed." });
    } finally {
      setWorking(false);
      setDeleteConfirmOpen(false);
      setDeleteConfirmText("");
    }
  }

  function exportCsv(scope: "selected" | "filtered" | "all") {
    let rows: Restaurant[];
    if (scope === "selected") {
      rows = restaurants.filter((r) => selectedIds.has(r.id));
    } else if (scope === "filtered") {
      rows = filtered;
    } else {
      rows = restaurants;
    }
    if (rows.length === 0) {
      setMessage({ kind: "error", text: "Nothing to export." });
      return;
    }
    const csv = buildCsv(rows);
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(csv, `visit-sd-restaurants-${scope}-${date}.csv`);
    setMessage({
      kind: "success",
      text: `Exported ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
    });
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Loading...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-error text-lg mb-4">Access Denied</p>
          <p className="text-txt2 text-sm mb-6">
            Only admins can access restaurant maintenance.
          </p>
          <Link href="/" className="text-accent hover:underline">
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="relative pt-10 px-6 pb-6 border-b-2 border-txt">
        <div className="absolute top-4 right-4 flex gap-2">
          <ThemeToggle />
          <AdminButton />
        </div>
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
          Admin · Restaurant Maintenance
        </p>
        <h1 className="font-display text-5xl mb-2">RESTAURANTS</h1>
        <p className="text-txt2 text-sm">
          Bulk-change visibility, export as CSV
          {isSuperuser ? ", or hard-delete records" : ""}.
        </p>
        <div className="mt-4">
          <Link href="/" className="text-sm text-accent hover:underline">
            ← Back home
          </Link>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        {message && (
          <div
            className={`mb-4 p-3 border-[1.5px] text-sm ${
              message.kind === "success"
                ? "border-accent text-accent bg-accent/10"
                : "border-error text-error bg-error/10"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-center mb-3">
          <input
            type="text"
            placeholder="Search name, cuisine, area, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base !py-2 !px-3 flex-1 min-w-[200px]"
          />
          <select
            value={visibilityFilter}
            onChange={(e) =>
              setVisibilityFilter(e.target.value as Visibility | "all")
            }
            aria-label="Filter by visibility"
            className="chip !pr-7 !pl-3 appearance-none cursor-pointer"
          >
            <option value="all">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex gap-2 flex-wrap items-center mb-4 p-3 border-[1.5px] border-brd bg-bg2/40">
          <span className="text-xs font-medium text-txt2 uppercase tracking-wide">
            {selectedIds.size} selected
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-2xs font-medium text-accent bg-transparent border-none cursor-pointer px-1 transition-opacity duration-150 hover:opacity-70"
            >
              Clear
            </button>
          )}
          <span className="mx-2 h-5 w-px bg-brd" aria-hidden />
          <span className="text-xs font-medium text-txt2 uppercase tracking-wide">
            Set visibility:
          </span>
          <select
            value={visibilityTarget}
            onChange={(e) => setVisibilityTarget(e.target.value as Visibility)}
            className="chip !pr-7 !pl-3 appearance-none cursor-pointer"
          >
            {VISIBILITY_VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={applyBulkVisibility}
            disabled={working || selectedIds.size === 0}
            className="btn-primary !py-1.5 !px-3 !text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {working ? "Applying..." : "Apply"}
          </button>
          <span className="mx-2 h-5 w-px bg-brd" aria-hidden />
          <button
            onClick={() => exportCsv("selected")}
            disabled={selectedIds.size === 0}
            className="chip disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export selected
          </button>
          <button
            onClick={() => exportCsv("filtered")}
            disabled={filtered.length === 0}
            className="chip disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export filtered
          </button>
          <button
            onClick={() => exportCsv("all")}
            disabled={restaurants.length === 0}
            className="chip disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export all
          </button>
          {isSuperuser && (
            <>
              <span className="mx-2 h-5 w-px bg-brd" aria-hidden />
              <button
                onClick={() => {
                  setDeleteConfirmText("");
                  setDeleteConfirmOpen(true);
                }}
                disabled={working || selectedIds.size === 0}
                className="btn-primary !py-1.5 !px-3 !text-xs !bg-error !border-error !text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Hard delete
              </button>
            </>
          )}
        </div>

        {loading ? (
          <p className="text-txt2 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-txt2 text-sm">No restaurants match.</p>
        ) : (
          <div className="overflow-x-auto border-[1.5px] border-brd">
            <table className="w-full text-sm">
              <thead className="bg-bg2/60 text-txt2 uppercase text-2xs tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all filtered"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                    />
                  </th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Cuisine</th>
                  <th className="px-3 py-2 text-left">Area</th>
                  <th className="px-3 py-2 text-left">Price</th>
                  <th className="px-3 py-2 text-left">Visibility</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const selected = selectedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-brd hover:bg-bg2/40 cursor-pointer ${
                        selected ? "bg-accent/5" : ""
                      }`}
                      onClick={() => toggleOne(r.id)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleOne(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/restaurant/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-txt hover:text-accent no-underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-txt2">{r.cuisine}</td>
                      <td className="px-3 py-2 text-txt2">
                        {r.neighborhood}
                      </td>
                      <td className="px-3 py-2 text-txt2">{r.price}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 text-2xs font-medium uppercase tracking-wide border-[1.5px] ${
                            (r.visibility ?? "public") === "public"
                              ? "border-accent2 text-accent2"
                              : (r.visibility ?? "public") === "private"
                                ? "border-txt2 text-txt2"
                                : "border-error text-error"
                          }`}
                        >
                          {r.visibility ?? "public"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteConfirmOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !working) {
              setDeleteConfirmOpen(false);
              setDeleteConfirmText("");
            }
          }}
          className="fixed inset-0 bg-black/55 z-[100] flex items-center justify-center p-4"
        >
          <div className="bg-bg border-2 border-error p-6 w-full max-w-[440px]">
            <p className="font-display text-2xl mb-3 text-error">
              HARD DELETE
            </p>
            <p className="text-sm text-txt mb-3 leading-relaxed">
              You are about to permanently delete{" "}
              <span className="font-medium">{selectedIds.size}</span>{" "}
              restaurant{selectedIds.size === 1 ? "" : "s"} and all related
              data (visits, menu items, orders, ratings, wishlist entries).
              This cannot be undone.
            </p>
            <p className="text-xs text-txt2 mb-2 uppercase tracking-wide">
              Type <span className="font-mono text-error">delete</span> to
              confirm
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoFocus
              disabled={working}
              className="input-base w-full mb-5"
              placeholder="delete"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmText("");
                }}
                disabled={working}
                className="btn-outline flex-1 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={hardDeleteSelected}
                disabled={
                  working ||
                  deleteConfirmText.trim().toLowerCase() !== "delete"
                }
                className="btn-primary flex-1 !bg-error !border-error !text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {working ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
