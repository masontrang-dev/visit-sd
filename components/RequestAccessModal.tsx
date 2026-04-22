"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth-context";

type RoleRequest = {
  id: number;
  requested_role: "admin" | "curator";
  status: "pending" | "approved" | "denied";
  created_at: string;
};

export default function RequestAccessModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState<"admin" | "curator" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error: fetchErr } = await supabase
        .from("role_requests")
        .select("id, requested_role, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (fetchErr) setError(fetchErr.message);
      else setRequests((data as RoleRequest[]) ?? []);
    })();
  }, [supabase, user]);

  const pending = requests.filter((r) => r.status === "pending");
  const hasPending = (role: "admin" | "curator") =>
    pending.some((r) => r.requested_role === role);

  async function submit(role: "admin" | "curator") {
    if (!user) return;
    setSubmitting(role);
    setError(null);
    const { data, error: insertErr } = await supabase
      .from("role_requests")
      .insert({
        user_id: user.id,
        requested_role: role,
        message: message.trim() || null,
      })
      .select("id, requested_role, status, created_at")
      .single();

    if (insertErr) {
      setError(insertErr.message);
    } else if (data) {
      setRequests([data as RoleRequest, ...requests]);
      setMessage("");
    }
    setSubmitting(null);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg border-2 border-txt rounded-md max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-3xl leading-none">
              REQUEST ACCESS
            </h2>
            <p className="text-txt2 text-sm mt-1">
              Ask a superuser to grant you admin or curator privileges.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-txt2 hover:text-txt text-xl leading-none"
          >
            ×
          </button>
        </div>

        {pending.length > 0 && (
          <div className="mb-4 p-3 border border-accent bg-accent/10 rounded-md">
            <p className="text-accent text-sm font-medium">
              Pending:{" "}
              {pending.map((r) => r.requested_role).join(", ")}
            </p>
            <p className="text-txt2 text-xs mt-1">
              A superuser will review shortly.
            </p>
          </div>
        )}

        <label
          htmlFor="request-message"
          className="block text-xs uppercase tracking-wide text-txt2 mb-1"
        >
          Message (optional)
        </label>
        <textarea
          id="request-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Why would you like access?"
          className="input-base mb-4 resize-none"
        />

        {error && <p className="text-error text-sm mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => submit("curator")}
            disabled={submitting !== null || hasPending("curator")}
            className="btn-secondary flex-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasPending("curator")
              ? "Curator pending"
              : submitting === "curator"
                ? "Requesting…"
                : "Request curator"}
          </button>
          <button
            onClick={() => submit("admin")}
            disabled={submitting !== null || hasPending("admin")}
            className="btn-secondary flex-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasPending("admin")
              ? "Admin pending"
              : submitting === "admin"
                ? "Requesting…"
                : "Request admin"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
