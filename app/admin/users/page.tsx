"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";

type UserWithRoles = {
  id: string;
  email: string;
  roles: string[];
  display_name?: string;
};

export default function UsersPage() {
  const { isSuperuser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && isSuperuser) {
      loadUsers();
    }
  }, [isSuperuser, authLoading]);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name");

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (profileError || roleError) {
        setError("Failed to load user data");
        return;
      }

      const rolesByUser: Record<string, string[]> = {};
      roles?.forEach((r) => {
        if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
        rolesByUser[r.user_id].push(r.role);
      });

      const usersData =
        profiles?.map((p) => ({
          id: p.user_id,
          email: p.display_name || "User",
          roles: rolesByUser[p.user_id] || ["user"],
          display_name: p.display_name,
        })) || [];

      setUsers(usersData);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function grantRole(userId: string, role: "admin" | "superuser") {
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
      loadUsers();
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
      loadUsers();
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

        {loading ? (
          <p className="text-txt2 text-sm">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-txt2 text-sm">No users found.</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="border border-brd rounded-lg p-4 bg-bg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-txt">
                      {user.display_name || user.email}
                    </p>
                    <p className="text-xs text-txt2 mt-1">
                      ID: {user.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          role === "superuser"
                            ? "bg-error/20 text-error"
                            : role === "admin"
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
                  {!user.roles.includes("admin") && (
                    <button
                      onClick={() => grantRole(user.id, "admin")}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      Grant Admin
                    </button>
                  )}
                  {user.roles.includes("admin") && (
                    <button
                      onClick={() => revokeRole(user.id, "admin")}
                      className="btn-secondary text-xs py-1 px-3 !border-error !text-error"
                    >
                      Revoke Admin
                    </button>
                  )}
                  {!user.roles.includes("superuser") && (
                    <button
                      onClick={() => grantRole(user.id, "superuser")}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      Grant Superuser
                    </button>
                  )}
                  {user.roles.includes("superuser") && (
                    <button
                      onClick={() => revokeRole(user.id, "superuser")}
                      className="btn-secondary text-xs py-1 px-3 !border-error !text-error"
                    >
                      Revoke Superuser
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
