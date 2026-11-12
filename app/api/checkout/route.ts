import Stripe from "stripe";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db, failure } from "@/lib/server";
import { validatePack } from "@/lib/domain";
const schema = z.object({
  key: z.uuid(),
  pack_size: z.number().int(),
  batch_id: z.uuid(),
  items: z
    .array(
      z.object({
        meal_id: z.string().max(60),
        quantity: z.number().int().positive().max(5),
      }),
    )
    .max(5),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().min(8).max(30),
});
export async function POST(req: Request) {
  try {
    if (process.env.CHECKOUT_ENABLED !== "true")
      return Response.json(
        {
          error: "Checkout is not open yet. This preview accepts no payments.",
        },
        { status: 503 },
      );
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key?.startsWith("sk_test_"))
      throw new Error("Stripe test mode is not configured.");
    if (Number(req.headers.get("content-length")) > 10000)
      throw new Error("Request too large");
    const body = schema.parse(await req.json());
    validatePack(body.pack_size, body.items);
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          ...body,
          items: [...body.items].sort((a, b) =>
            a.meal_id.localeCompare(b.meal_id),
          ),
        }),
      )
      .digest("hex");
    const d = db();
    const { data: order, error } = await d.rpc("reserve_order", {
      p_key: body.key,
      p_fingerprint: fingerprint,
      p_batch: body.batch_id,
      p_size: body.pack_size,
      p_name: body.name,
      p_email: body.email,
      p_phone: body.phone,
      p_items: body.items,
    });
    if (error) throw new Error(error.message);
    const stripe = new Stripe(key);
    const app = process.env.APP_URL;
    if (!app) throw new Error("Application URL is required.");
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        allowed_payment_method_types: ["card"],
        customer_email: body.email,
        payment_intent_data: { receipt_email: body.email },
        line_items: [
          {
            price_data: {
              currency: "aud",
              unit_amount: order.total_cents,
              product_data: {
                name: `RM — ${body.pack_size}RM mixed meal pack`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: { order_id: order.id },
        client_reference_id: order.id,
        expires_at: Math.floor(new Date(order.reserved_until).getTime() / 1000),
        success_url: `${app}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${app}/#menu`,
      },
      { idempotencyKey: `rm-${order.id}` },
    );
    const { error: updateError } = await d
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);
    if (updateError)
      throw new Error("Could not attach checkout session. Please retry.");
    return Response.json({ url: session.url });
  } catch (e) {
    return failure(e);
  }
}
