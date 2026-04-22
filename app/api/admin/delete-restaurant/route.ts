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

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: "ids must be a non-empty array of restaurant ids" },
      { status: 400 },
    );
  }
  const ids: number[] = [];
  for (const raw of body.ids) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json(
        { error: `Invalid id: ${String(raw)}` },
        { status: 400 },
      );
    }
    ids.push(n);
  }

  const cookieSupabase = await createServerClient();
  const {
    data: { user: caller },
  } = await cookieSupabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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
      { error: "Only superusers can hard-delete restaurants" },
      { status: 403 },
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // restaurant_visits predates the SQL migrations in the repo; its FK may not
  // declare ON DELETE CASCADE. Clear it explicitly so the parent delete won't
  // fail on a FK violation and so we don't leave orphaned visit rows.
  const { error: visitsError } = await admin
    .from("restaurant_visits")
    .delete()
    .in("restaurant_id", ids);
  if (visitsError) {
    return NextResponse.json(
      { error: `Failed to delete visits: ${visitsError.message}` },
      { status: 500 },
    );
  }

  const { error: deleteError, count } = await admin
    .from("restaurants")
    .delete({ count: "exact" })
    .in("id", ids);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? ids.length });
}
