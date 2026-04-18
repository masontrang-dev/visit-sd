import { createClient } from "./supabase-server";

export type UserRole = "superuser" | "admin" | "user";

export interface UserWithRoles {
  id: string;
  email: string;
  roles: UserRole[];
  isSuperuser: boolean;
  isAdmin: boolean;
  displayName?: string;
  avatarUrl?: string;
}

export async function getCurrentUser(): Promise<UserWithRoles | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (rolesData?.map((r: { role: string }) => r.role) ||
    []) as UserRole[];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email || "",
    roles,
    isSuperuser: roles.includes("superuser"),
    isAdmin: roles.includes("admin") || roles.includes("superuser"),
    displayName: profile?.display_name,
    avatarUrl: profile?.avatar_url,
  };
}

export async function hasRole(
  userId: string,
  requiredRole: UserRole,
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", requiredRole)
    .single();

  return !!data;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "superuser"]);

  return (data?.length || 0) > 0;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}

export async function requireSuperuser() {
  const user = await requireAuth();
  if (!user.isSuperuser) {
    throw new Error("Forbidden: Superuser access required");
  }
  return user;
}
