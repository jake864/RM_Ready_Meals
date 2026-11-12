import { test } from "node:test";
import assert from "node:assert/strict";
import { nextBatch, validatePack, payable, summarize } from "../lib/domain";
import { demoData } from "../lib/demo";
import { packs } from "../lib/catalog";
test("mix and match exact pack counts and reject duplicates/fractions", () => {
  for (const n of [1, 3, 5])
    assert.doesNotThrow(() =>
      validatePack(n, [{ meal_id: "ragu", quantity: n }]),
    );
  for (const items of [
    [{ meal_id: "ragu", quantity: 2 }],
    [
      { meal_id: "ragu", quantity: 1.5 },
      { meal_id: "nasi", quantity: 1.5 },
    ],
    [
      { meal_id: "ragu", quantity: 1 },
      { meal_id: "ragu", quantity: 2 },
    ],
  ])
    assert.throws(() => validatePack(3, items));
  assert.throws(() => validatePack(4, [{ meal_id: "ragu", quantity: 4 }]));
});
test("illustrative pack prices are integer AUD cents", () =>
  assert.deepEqual(
    packs.map((p) => [p.size, p.price]),
    [
      [1, 1500],
      [3, 4200],
      [5, 6500],
    ],
  ));
test("Sunday 8pm cutoff is strict in Melbourne daylight savings", () => {
  assert.equal(
    nextBatch(new Date("2026-11-15T08:59:59Z")).production,
    "2026-11-17",
  );
  assert.equal(
    nextBatch(new Date("2026-11-15T09:00:00Z")).production,
    "2026-11-24",
  );
});
test("Sunday 8pm cutoff during winter", () => {
  assert.equal(
    nextBatch(new Date("2026-07-05T09:59:59Z")).production,
    "2026-07-07",
  );
  assert.equal(
    nextBatch(new Date("2026-07-05T10:00:00Z")).production,
    "2026-07-14",
  );
});
test("DST changes do not shift local cutoff or Tuesday collection", () => {
  const b = nextBatch(new Date("2026-10-03T00:00:00Z"));
  assert.equal(b.cutoff, "2026-10-04T09:00:00.000Z");
  assert.equal(b.pickup, "2026-10-06T06:00:00.000Z");
});
test("payment must be test-mode, paid, AUD, and the expected amount", () => {
  const s = {
    livemode: false,
    payment_status: "paid",
    currency: "aud",
    amount_total: 4200,
  };
  assert.ok(payable(s, 4200));
  for (const patch of [
    { livemode: true },
    { payment_status: "unpaid" },
    { currency: "usd" },
    { amount_total: 1 },
  ])
    assert.equal(payable({ ...s, ...patch }, 4200), false);
});
test("production summaries exclude unpaid orders", () => {
  const s = summarize([
    ...demoData.orders,
    { ...demoData.orders[0], status: "pending" },
  ]);
  assert.deepEqual(s, {
    orders: 3,
    revenue: 12200,
    meals: 9,
    quantities: { ragu: 3, kecap: 2, rendang: 2, nasi: 2 },
  });
});
