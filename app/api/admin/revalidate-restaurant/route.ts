import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  let body: { ids?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Accept either a single `id` or an `ids` array (for chain-cascade updates
  // that touch sibling restaurants).
  const raw: unknown[] = Array.isArray(body.ids)
    ? body.ids
    : body.id != null
      ? [body.id]
      : [];
  if (raw.length === 0) {
    return NextResponse.json(
      { error: "Must provide id or non-empty ids array" },
      { status: 400 },
    );
  }
  const ids: number[] = [];
  for (const v of raw) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json(
        { error: `Invalid id: ${String(v)}` },
        { status: 400 },
      );
    }
    ids.push(n);
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (rolesError) {
    return NextResponse.json({ error: rolesError.message }, { status: 500 });
  }
  const isAdmin = roles?.some(
    (r) => r.role === "admin" || r.role === "superuser",
  );
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const revalidated: string[] = [];
  for (const id of ids) {
    const path = `/restaurant/${id}`;
    revalidatePath(path);
    revalidated.push(path);
  }
  return NextResponse.json({ ok: true, revalidated });
}
