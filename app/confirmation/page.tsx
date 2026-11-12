import { db } from "@/lib/server";
import { testStripe } from "@/lib/stripe";
import { payable } from "@/lib/domain";
import { money } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function Confirmation({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  let status = "Payment verification pending",
    info =
      "Payment is verified securely by our server. Please refresh shortly.";
  try {
    if (!session_id?.startsWith("cs_test_")) throw new Error();
    const session = await testStripe().checkout.sessions.retrieve(session_id);
    const { data } = await db()
      .from("orders")
      .select("status,total_cents,production_batches(production_date)")
      .eq("stripe_session_id", session.id)
      .single();
    if (
      data &&
      ["confirmed", "preparing", "packed", "dispatched", "collected"].includes(
        data.status,
      ) &&
      payable(session, data.total_cents)
    ) {
      status = "You’re on the list.";
      info = `Test order confirmed · ${money(data.total_cents)}. Collection at CrossFit Ocean Grove on your selected Tuesday. Keep your Stripe test receipt and this page for reference.`;
    }
  } catch {
    info =
      "No verified order found. If you completed test checkout, check your confirmation link or contact the kitchen.";
  }
  return (
    <main className="page-shell">
      <div className="eyebrow">RM — READY MEALS</div>
      <h1>{status}</h1>
      <p>{info}</p>
      <p className="notice">Test mode · No live payment has been taken.</p>
      <a className="button lime" href="/account">
        View my orders ↗
      </a>
    </main>
  );
}
