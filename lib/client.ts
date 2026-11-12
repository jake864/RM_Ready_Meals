import { createClient } from "@supabase/supabase-js";
let client: ReturnType<typeof createClient> | null = null;
export function authClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    throw new Error("Accounts will be available when Supabase is connected.");
  return (client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ));
}
export async function authHeaders() {
  const { data } = await authClient().auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token || ""}`,
  };
}
