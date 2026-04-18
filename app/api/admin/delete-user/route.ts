import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const targetUserId = body.userId;
  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // 1. Identify the caller via the cookie-bound session
  const cookieSupabase = await createServerClient();
  const {
    data: { user: caller },
  } = await cookieSupabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (caller.id === targetUserId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  // 2. Confirm the caller is a superuser.
  //    RLS on user_roles lets a user read their own rows, so this query
  //    is scoped to the caller's roles only — no trust of client claims.
  const { data: callerRoles, error: rolesError } = await cookieSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id);
  if (rolesError) {
    return NextResponse.json({ error: rolesError.message }, { status: 500 });
  }
  const isSuperuser = callerRoles?.some((r) => r.role === "superuser");
  if (!isSuperuser) {
    return NextResponse.json(
      { error: "Only superusers can delete users" },
      { status: 403 },
    );
  }

  // 3. Delete via the service-role admin API. Cascade handles the
  //    public.user_profiles / user_roles / role_requests rows because
  //    they FK to auth.users(id) ON DELETE CASCADE.
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(
    targetUserId,
  );
  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
