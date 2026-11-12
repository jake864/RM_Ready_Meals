import "server-only";
import { createClient } from "@supabase/supabase-js";
export function db() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    throw new Error("Database is not connected.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function user(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}
export async function admin(req: Request) {
  const u = await user(req);
  const { data } = await db()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", u.id)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
  return u;
}
export function failure(e: unknown) {
  const message = e instanceof Error ? e.message : "Request failed";
  const status =
    message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
  return Response.json({ error: message }, { status });
}
