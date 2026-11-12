import { meals, packs } from "./catalog";
import { nextBatch } from "./domain";
const b = nextBatch();
export const demoData = {
  meals,
  packs,
  batches: [
    {
      id: "demo",
      production_date: b.production,
      cutoff_at: b.cutoff,
      pickup_at: b.pickup,
      suspended: false,
      capacity: 200,
    },
  ],
  jobs: [],
  orders: [
    {
      id: "sample-001",
      customer_name: "Alex Morgan",
      customer_email: "alex@example.test",
      customer_phone: "0400 000 001",
      batch_id: "demo",
      status: "confirmed",
      total_cents: 6500,
      order_items: [
        { meal_id: "ragu", quantity: 2 },
        { meal_id: "kecap", quantity: 2 },
        { meal_id: "rendang", quantity: 1 },
      ],
    },
    {
      id: "sample-002",
      customer_name: "Sam Taylor",
      customer_email: "sam@example.test",
      customer_phone: "0400 000 002",
      batch_id: "demo",
      status: "packed",
      total_cents: 4200,
      order_items: [
        { meal_id: "nasi", quantity: 2 },
        { meal_id: "rendang", quantity: 1 },
      ],
    },
    {
      id: "sample-003",
      customer_name: "Jordan Lee",
      customer_email: "jordan@example.test",
      customer_phone: "0400 000 003",
      batch_id: "demo",
      status: "collected",
      total_cents: 1500,
      order_items: [{ meal_id: "ragu", quantity: 1 }],
    },
  ],
};
