import Stripe from "stripe";
export function testStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_"))
    throw new Error("Only Stripe test mode is supported.");
  return new Stripe(key);
}
