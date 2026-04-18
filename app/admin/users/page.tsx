"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";

type GrantableRole = "admin" | "curator" | "superuser";
type RequestRole = "admin" | "curator";

type UserWithRoles = {
  id: string;
  email: string;
  roles: string[];
  display_name?: string;
};

type PendingRequest = {
  id: number;
  user_id: string;
  requested_role: RequestRole;
  message: string | null;
  created_at: string;
  display_name: string | null;
};

export default function UsersPage() {
  const { isSuperuser, isLoading: authLoading, user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && isSuperuser) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperuser, authLoading]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadUsers(), loadRequests()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, display_name");

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (profileError) {
      setError(`Profiles: ${profileError.message}`);
      return;
    }
    if (roleError) {
      setError(`Roles: ${roleError.message}`);
      return;
    }

    const rolesByUser: Record<string, string[]> = {};
    roles?.forEach((r) => {
      if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
      rolesByUser[r.user_id].push(r.role);
    });

    setUsers(
      profiles?.map((p) => ({
        id: p.user_id,
        email: p.display_name || "User",
        roles: rolesByUser[p.user_id] || ["user"],
        display_name: p.display_name,
      })) || [],
    );
  }

  async function loadRequests() {
    const { data, error: reqErr } = await supabase
      .from("role_requests")
      .select("id, user_id, requested_role, message, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (reqErr) {
      setError(`Requests: ${reqErr.message}`);
      return;
    }
    if (!data || data.length === 0) {
      setRequests([]);
      return;
    }

    const userIds = Array.from(new Set(data.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameByUser: Record<string, string | null> = {};
    profiles?.forEach((p) => {
      nameByUser[p.user_id] = p.display_name;
    });

    setRequests(
      data.map((r) => ({
        ...r,
        display_name: nameByUser[r.user_id] ?? null,
      })) as PendingRequest[],
    );
  }

  async function approveRequest(req: PendingRequest) {
    setError("");
    setSuccess("");

    const { error: insertErr } = await supabase
      .from("user_roles")
      .insert({ user_id: req.user_id, role: req.requested_role });

    if (insertErr && insertErr.code !== "23505") {
      setError(`Grant failed: ${insertErr.message}`);
      return;
    }

    const { error: updateErr } = await supabase
      .from("role_requests")
      .update({
        status: "approved",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id ?? null,
      })
      .eq("id", req.id);

    if (updateErr) {
      setError(`Resolve failed: ${updateErr.message}`);
      return;
    }

    setSuccess(
      `Granted ${req.requested_role} to ${req.display_name || "user"}`,
    );
    loadAll();
  }

  async function denyRequest(req: PendingRequest) {
    setError("");
    setSuccess("");

    const { error: updateErr } = await supabase
      .from("role_requests")
      .update({
        status: "denied",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id ?? null,
      })
      .eq("id", req.id);

    if (updateErr) {
      setError(`Deny failed: ${updateErr.message}`);
      return;
    }

    setSuccess(`Denied ${req.requested_role} request`);
    loadAll();
  }

  async function grantRole(userId: string, role: GrantableRole) {
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (error) {
      if (error.code === "23505") {
        setError("User already has this role");
      } else {
        setError("Failed to grant role");
      }
    } else {
      setSuccess(`Successfully granted ${role} role`);
      loadAll();
    }
  }

  async function revokeRole(userId: string, role: string) {
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      setError("Failed to revoke role");
    } else {
      setSuccess(`Successfully revoked ${role} role`);
      loadAll();
    }
  }

  async function deleteUser(targetUser: UserWithRoles) {
    setError("");
    setSuccess("");

    const label = targetUser.display_name || targetUser.email;
    const confirmed = window.confirm(
      `Permanently delete ${label}? This removes their auth account, profile, roles, and any pending requests. Cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete user");
        return;
      }
      setSuccess(`Deleted ${label}`);
      loadAll();
    } catch (err) {
      console.error("[admin/users] deleteUser:", err);
      setError("Failed to delete user");
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Loading...</p>
      </main>
    );
  }

  if (!isSuperuser) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-error text-lg mb-4">Access Denied</p>
          <p className="text-txt2 text-sm mb-6">
            Only superusers can access user management.
          </p>
          <Link href="/admin" className="text-accent hover:underline">
            Back to Admin
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
          Admin · User Management
        </p>
        <h1 className="font-display text-5xl mb-2">USERS</h1>
        <p className="text-txt2 text-sm">Manage user roles and permissions</p>
        <div className="mt-4">
          <Link href="/admin" className="text-sm text-accent hover:underline">
            ← Back to Admin
          </Link>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
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

        {requests.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-2xl mb-3">PENDING REQUESTS</h2>
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="border border-accent rounded-lg p-4 bg-accent/5"
                >
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div>
                      <p className="font-medium text-txt">
                        {req.display_name || "User"}{" "}
                        <span className="text-txt2 font-normal">
                          wants{" "}
                        </span>
                        <span className="text-accent">
                          {req.requested_role}
                        </span>
                      </p>
                      <p className="text-xs text-txt2 mt-1">
                        {new Date(req.created_at).toLocaleString()} · ID:{" "}
                        {req.user_id.slice(0, 8)}…
                      </p>
                      {req.message && (
                        <p className="text-sm text-txt mt-2 italic">
                          “{req.message}”
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => approveRequest(req)}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => denyRequest(req)}
                        className="btn-secondary text-xs py-1 px-3 !border-error !text-error"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <p className="text-txt2 text-sm">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-txt2 text-sm">No users found.</p>
        ) : (
          <div className="space-y-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="border border-brd rounded-lg p-4 bg-bg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-txt">
                      {u.display_name || u.email}
                    </p>
                    <p className="text-xs text-txt2 mt-1">
                      ID: {u.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {u.roles.map((role) => (
                      <span
                        key={role}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          role === "superuser"
                            ? "bg-error/20 text-error"
                            : role === "admin" || role === "curator"
                              ? "bg-accent/20 text-accent"
                              : "bg-txt2/20 text-txt2"
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {(["curator", "admin", "superuser"] as const).map((role) =>
                    u.roles.includes(role) ? (
                      <button
                        key={role}
                        onClick={() => revokeRole(u.id, role)}
                        className="btn-secondary text-xs py-1 px-3 !border-error !text-error"
                      >
                        Revoke {role}
                      </button>
                    ) : (
                      <button
                        key={role}
                        onClick={() => grantRole(u.id, role)}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Grant {role}
                      </button>
                    ),
                  )}
                  {u.id !== user?.id && (
                    <button
                      onClick={() => deleteUser(u)}
                      className="btn-secondary text-xs py-1 px-3 !border-error !bg-error !text-white ml-auto"
                    >
                      Delete user
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
