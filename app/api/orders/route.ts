import { db, user, failure } from "@/lib/server";
export async function GET(req: Request) {
  try {
    const u = await user(req);
    const { data, error } = await db()
      .from("orders")
      .select(
        "id,status,total_cents,created_at,production_batches(production_date,pickup_at),order_items(meal_id,quantity,meals(name))",
      )
      .eq("customer_id", u.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return failure(e);
  }
}
