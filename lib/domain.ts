import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
export const ZONE = "Australia/Melbourne";
export function nextBatch(now = new Date()) {
  const local = formatInTimeZone(now, ZONE, "yyyy-MM-dd");
  const day = new Date(local + "T12:00:00Z");
  const delta = (2 - day.getUTCDay() + 7) % 7;
  day.setUTCDate(day.getUTCDate() + delta);
  let production = day.toISOString().slice(0, 10);
  const cutoffFor = (d: Date) => {
    const c = new Date(d);
    c.setUTCDate(c.getUTCDate() - 2);
    return fromZonedTime(c.toISOString().slice(0, 10) + "T20:00:00", ZONE);
  };
  if (now >= cutoffFor(day)) {
    day.setUTCDate(day.getUTCDate() + 7);
    production = day.toISOString().slice(0, 10);
  }
  return {
    production,
    cutoff: cutoffFor(day).toISOString(),
    pickup: fromZonedTime(production + "T17:00:00", ZONE).toISOString(),
  };
}
export function validatePack(
  size: number,
  items: { meal_id: string; quantity: number }[],
) {
  if (
    ![1, 3, 5].includes(size) ||
    !items.length ||
    new Set(items.map((i) => i.meal_id)).size !== items.length ||
    items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1) ||
    items.reduce((n, i) => n + i.quantity, 0) !== size
  )
    throw new Error("Choose exactly the number of meals in your pack.");
}
export function payable(
  session: {
    payment_status: string;
    currency: string | null;
    amount_total: number | null;
    livemode: boolean;
  },
  expected: number,
) {
  return (
    !session.livemode &&
    session.payment_status === "paid" &&
    session.currency === "aud" &&
    session.amount_total === expected
  );
}
export function summarize(
  orders: {
    status: string;
    total_cents: number;
    order_items: { meal_id: string; quantity: number }[];
  }[],
) {
  const paid = orders.filter((o) =>
    ["confirmed", "preparing", "packed", "dispatched", "collected"].includes(
      o.status,
    ),
  );
  const quantities: Record<string, number> = {};
  for (const o of paid)
    for (const i of o.order_items)
      quantities[i.meal_id] = (quantities[i.meal_id] || 0) + i.quantity;
  return {
    orders: paid.length,
    revenue: paid.reduce((n, o) => n + o.total_cents, 0),
    meals: Object.values(quantities).reduce((a, b) => a + b, 0),
    quantities,
  };
}
