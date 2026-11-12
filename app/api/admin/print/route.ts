import { z } from "zod";
import { admin, db, failure } from "@/lib/server";
export async function POST(req: Request) {
  try {
    await admin(req);
    const v = z
      .object({
        batch_id: z.uuid(),
        order_id: z.uuid().nullable(),
        key: z.string().min(1).max(150),
      })
      .parse(await req.json());
    const d = db();
    const { data: existing } = await d
      .from("print_jobs")
      .select("id")
      .eq("document_key", v.key)
      .maybeSingle();
    if (existing)
      return Response.json(
        {
          error:
            "This print dialog was already requested. Use a new explicit reprint attempt.",
        },
        { status: 409 },
      );
    const { error } = await d
      .from("print_jobs")
      .insert({
        batch_id: v.batch_id,
        order_id: v.order_id,
        document_key: v.key,
        status: "browser_dialog_opened",
        attempts: 1,
      });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
