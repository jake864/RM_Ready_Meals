import { z } from "zod";
import { admin, db, failure } from "@/lib/server";
const statuses = [
  "confirmed",
  "preparing",
  "packed",
  "dispatched",
  "collected",
] as const;
export async function GET(req: Request) {
  try {
    await admin(req);
    const d = db();
    const [o, m, b, p, j] = await Promise.all([
      d
        .from("orders")
        .select("*,order_items(*),production_batches(production_date)")
        .order("created_at", { ascending: false }),
      d.from("meals").select("*").order("sort_order"),
      d.from("production_batches").select("*").order("production_date"),
      d.from("pack_configurations").select("*").order("size"),
      d
        .from("print_jobs")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    for (const r of [o, m, b, p, j]) if (r.error) throw r.error;
    return Response.json({
      orders: o.data,
      meals: m.data,
      batches: b.data,
      packs: p.data,
      jobs: j.data,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(req: Request) {
  try {
    await admin(req);
    const body = await req.json();
    const d = db();
    let error;
    if (body.kind === "order") {
      const v = z
        .object({ id: z.uuid(), status: z.enum(statuses) })
        .parse(body);
      ({ error } = await d
        .from("orders")
        .update({ status: v.status })
        .eq("id", v.id)
        .in("status", statuses));
    } else if (body.kind === "meal") {
      const v = z
        .object({
          id: z.string().min(1),
          name: z.string().min(1).max(100),
          description: z.string().max(1000),
          ingredients: z.string().max(2000),
          allergens: z.string().max(1000),
          active: z.boolean(),
        })
        .parse(body);
      const { id, ...update } = v;
      ({ error } = await d.from("meals").update(update).eq("id", id));
    } else if (body.kind === "pack") {
      const v = z
        .object({
          size: z.union([z.literal(1), z.literal(3), z.literal(5)]),
          price: z.number().int().positive().max(100000),
        })
        .parse(body);
      ({ error } = await d
        .from("pack_configurations")
        .update({ price: v.price })
        .eq("size", v.size));
    } else if (body.kind === "batch") {
      const v = z
        .object({
          id: z.uuid(),
          cutoff_at: z.iso.datetime({ offset: true }),
          pickup_at: z.iso.datetime({ offset: true }),
          suspended: z.boolean(),
          capacity: z.number().int().nonnegative().max(10000),
          meal_caps: z.record(
            z.string(),
            z.number().int().nonnegative().max(10000),
          ),
        })
        .parse(body);
      const { id, ...update } = v;
      ({ error } = await d
        .from("production_batches")
        .update(update)
        .eq("id", id));
    } else throw new Error("Unsupported update");
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    await admin(req);
    const body = z
      .object({
        production_date: z.iso.date(),
        cutoff_at: z.iso.datetime({ offset: true }),
        pickup_at: z.iso.datetime({ offset: true }),
        capacity: z.number().int().positive().max(10000),
      })
      .parse(await req.json());
    const { error } = await db().from("production_batches").insert(body);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
