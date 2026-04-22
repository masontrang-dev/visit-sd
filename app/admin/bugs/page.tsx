"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";

type BugReport = {
  id: number;
  user_id: string | null;
  title: string;
  description: string;
  url: string | null;
  user_agent: string | null;
  status: "open" | "closed";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

type BugWithReporter = BugReport & {
  reporter_name: string | null;
};

type StatusFilter = "open" | "closed" | "all";

export default function BugsPage() {
  const { isAdmin, isSuperuser, isLoading: authLoading, user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [bugs, setBugs] = useState<BugWithReporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadBugs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authLoading]);

  async function loadBugs() {
    setLoading(true);
    setError("");

    const { data: rows, error: fetchErr } = (await supabase
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false })) as {
      data: BugReport[] | null;
      error: { message: string } | null;
    };

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set(
        (rows ?? [])
          .map((r) => r.user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const nameByUser: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = (await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", userIds)) as {
        data: { user_id: string; display_name: string | null }[] | null;
      };
      profiles?.forEach((p) => {
        nameByUser[p.user_id] = p.display_name;
      });
    }

    setBugs(
      (rows ?? []).map((r) => ({
        ...r,
        reporter_name: r.user_id ? (nameByUser[r.user_id] ?? null) : null,
      })),
    );
    setLoading(false);
  }

  async function toggleStatus(bug: BugReport) {
    if (!isSuperuser) return;
    setError("");
    setSuccess("");

    const newStatus: "open" | "closed" =
      bug.status === "open" ? "closed" : "open";

    const { error: updateErr } = await supabase
      .from("bug_reports")
      .update({
        status: newStatus,
        resolved_at: newStatus === "closed" ? new Date().toISOString() : null,
        resolved_by: newStatus === "closed" ? (user?.id ?? null) : null,
      })
      .eq("id", bug.id);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setSuccess(`Marked as ${newStatus}`);
    loadBugs();
  }

  async function saveNotes(bugId: number) {
    if (!isSuperuser) return;
    setError("");
    setSuccess("");

    const { error: updateErr } = await supabase
      .from("bug_reports")
      .update({ admin_notes: notesDraft.trim() || null })
      .eq("id", bugId);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setSuccess("Notes saved");
    setEditingNotesId(null);
    setNotesDraft("");
    loadBugs();
  }

  async function deleteBug(bug: BugReport) {
    if (!isSuperuser) return;
    const confirmed = window.confirm(
      `Permanently delete bug "${bug.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error: delErr } = await supabase
      .from("bug_reports")
      .delete()
      .eq("id", bug.id);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    setSuccess("Bug deleted");
    loadBugs();
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
            Only admins can view bug reports.
          </p>
          <Link href="/" className="text-accent hover:underline">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const visible = bugs.filter((b) =>
    filter === "all" ? true : b.status === filter,
  );

  return (
    <main className="min-h-screen">
      <header className="relative pt-10 px-6 pb-6 border-b-2 border-txt">
        <div className="absolute top-4 right-4 flex gap-2">
          <ThemeToggle />
          <AdminButton />
        </div>
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
          Admin · Bug Reports
        </p>
        <h1 className="font-display text-5xl mb-2">BUGS</h1>
        <p className="text-txt2 text-sm">
          {isSuperuser
            ? "Triage, annotate, and close bug reports."
            : "Read-only view of submitted bug reports."}
        </p>
        <div className="mt-4">
          <Link href="/" className="text-sm text-accent hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-error/10 border border-error rounded-lg">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-accent/10 border border-accent rounded-lg">
            <p className="text-accent text-sm">{success}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(["open", "closed", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide border-[1.5px] transition-colors ${
                filter === f
                  ? "border-txt bg-txt text-bg"
                  : "border-brd text-txt2 hover:border-txt"
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs text-txt2">
            {visible.length} {visible.length === 1 ? "bug" : "bugs"}
          </span>
        </div>

        {loading ? (
          <p className="text-txt2 text-sm">Loading bugs...</p>
        ) : visible.length === 0 ? (
          <p className="text-txt2 text-sm">
            No bug reports{filter !== "all" ? ` (${filter})` : ""}.
          </p>
        ) : (
          <div className="space-y-3">
            {visible.map((bug) => (
              <div
                key={bug.id}
                className={`border rounded-lg p-4 bg-bg ${
                  bug.status === "open" ? "border-accent" : "border-brd"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${
                          bug.status === "open"
                            ? "bg-accent/20 text-accent"
                            : "bg-txt2/20 text-txt2"
                        }`}
                      >
                        {bug.status}
                      </span>
                      <p className="text-xs text-txt2">
                        #{bug.id} · {bug.reporter_name || "Anonymous"} ·{" "}
                        {new Date(bug.created_at).toLocaleString()}
                      </p>
                    </div>
                    <h3 className="font-medium text-txt">{bug.title}</h3>
                  </div>
                  {isSuperuser && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleStatus(bug)}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        {bug.status === "open" ? "Close" : "Reopen"}
                      </button>
                      <button
                        onClick={() => deleteBug(bug)}
                        className="btn-secondary text-xs py-1 px-3 !border-error !text-error"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-txt whitespace-pre-wrap mt-2">
                  {bug.description}
                </p>

                {bug.url && (
                  <p className="text-xs text-txt2 mt-3 break-all">
                    <span className="uppercase tracking-wide">URL:</span>{" "}
                    <a
                      href={bug.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {bug.url}
                    </a>
                  </p>
                )}

                {bug.user_agent && (
                  <p className="text-xs text-txt2 mt-1 break-all">
                    <span className="uppercase tracking-wide">UA:</span>{" "}
                    {bug.user_agent}
                  </p>
                )}

                {bug.resolved_at && (
                  <p className="text-xs text-txt2 mt-1">
                    <span className="uppercase tracking-wide">Closed:</span>{" "}
                    {new Date(bug.resolved_at).toLocaleString()}
                  </p>
                )}

                {(bug.admin_notes || isSuperuser) && (
                  <div className="mt-3 pt-3 border-t border-brd">
                    {editingNotesId === bug.id && isSuperuser ? (
                      <>
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={3}
                          placeholder="Admin notes (visible to admins only)"
                          className="input-base resize-none mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveNotes(bug.id)}
                            className="btn-secondary text-xs py-1 px-3"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingNotesId(null);
                              setNotesDraft("");
                            }}
                            className="btn-secondary text-xs py-1 px-3 !border-brd !bg-transparent !text-txt2"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-txt2 italic whitespace-pre-wrap flex-1">
                          {bug.admin_notes || "No admin notes."}
                        </p>
                        {isSuperuser && (
                          <button
                            onClick={() => {
                              setEditingNotesId(bug.id);
                              setNotesDraft(bug.admin_notes ?? "");
                            }}
                            className="btn-ghost text-xs shrink-0"
                          >
                            Edit notes
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
