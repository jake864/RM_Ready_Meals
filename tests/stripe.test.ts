import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
const stripe = new Stripe("sk_test_mock_not_a_credential");
test("Stripe webhook accepts valid signed raw body and rejects tampered payload", () => {
  const payload = JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: {
      object: { id: "cs_test_1", payment_status: "paid", livemode: false },
    },
  });
  const secret = "whsec_mock_only";
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  assert.equal(
    stripe.webhooks.constructEvent(payload, signature, secret).id,
    "evt_test",
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload + " ", signature, secret),
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload, signature, "wrong"),
  );
});
test("Stripe webhook rejects stale signed requests", () => {
  const payload = '{"id":"evt_stale"}';
  const secret = "whsec_mock_only";
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: Math.floor(Date.now() / 1000) - 600,
  });
  assert.throws(
    () => stripe.webhooks.constructEvent(payload, header, secret),
    /Timestamp outside/,
  );
});
