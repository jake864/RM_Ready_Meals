import { db } from "@/lib/server";
import { testStripe } from "@/lib/stripe";
export async function POST(req: Request) {
  let event;
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET)
      throw new Error("Missing webhook configuration");
    event = testStripe().webhooks.constructEvent(
      await req.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.expired") {
    try {
      const session = event.data
        .object as import("stripe").Stripe.Checkout.Session;
      if (session.livemode || session.status !== "expired")
        return Response.json(
          { error: "Invalid expired session" },
          { status: 400 },
        );
      const { error } = await db()
        .from("orders")
        .update({ status: "expired" })
        .eq("stripe_session_id", session.id)
        .eq("status", "pending");
      if (error) throw error;
      return Response.json({ received: true });
    } catch {
      return Response.json(
        { error: "Expiry processing failed" },
        { status: 500 },
      );
    }
  }
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  )
    return Response.json({ received: true });
  try {
    const session = event.data
      .object as import("stripe").Stripe.Checkout.Session;
    if (session.livemode)
      return Response.json(
        { error: "Live payments disabled" },
        { status: 400 },
      );
    if (session.payment_status !== "paid")
      return Response.json({ received: true });
    const { error } = await db().rpc("confirm_payment", {
      p_event: event.id,
      p_session: session.id,
      p_order: session.metadata?.order_id,
      p_amount: session.amount_total,
      p_currency: session.currency,
      p_intent:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
    });
    if (error) throw error;
    return Response.json({ received: true });
  } catch {
    return Response.json(
      { error: "Payment processing failed; retry required" },
      { status: 500 },
    );
  }
}
