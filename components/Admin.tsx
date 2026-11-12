"use client";
import { useState } from "react";
import { authClient, authHeaders } from "@/lib/client";
import { demoData } from "@/lib/demo";
import { Meal, money } from "@/lib/catalog";
import { summarize, ZONE } from "@/lib/domain";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
type Batch = {
  id: string;
  production_date: string;
  cutoff_at: string;
  pickup_at: string;
  suspended: boolean;
  capacity: number;
  meal_caps?: Record<string, number>;
};
type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  batch_id: string;
  status: string;
  total_cents: number;
  order_items: { meal_id: string; quantity: number }[];
};
type Data = {
  meals: Meal[];
  packs: { size: number; price: number }[];
  batches: Batch[];
  orders: Order[];
  jobs: {
    id: string;
    document_key: string;
    status: string;
    attempts: number;
  }[];
};
export default function Admin() {
  const [data, setData] = useState<Data | null>(null),
    [demo, setDemo] = useState(false),
    [tab, setTab] = useState("Overview"),
    [batch, setBatch] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [docket, setDocket] = useState(""),
    [reprint, setReprint] = useState(false);
  async function load() {
    const r = await fetch("/api/admin", { headers: await authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
    setBatch((v) => v || d.batches[0]?.id || "");
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const f = new FormData(e.currentTarget);
      const { error } = await authClient().auth.signInWithPassword({
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      if (error) throw error;
      await load();
      setDemo(false);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function update(payload: unknown, method = "PATCH") {
    setBusy(true);
    try {
      if (demo) {
        setMessage(
          "Sample workspace: edits are not saved. Connect Supabase and sign in as an administrator.",
        );
        return;
      }
      const r = await fetch("/api/admin", {
        method,
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setMessage("Saved.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function sample() {
    setData(structuredClone(demoData));
    setDemo(true);
    setBatch("demo");
    setMessage("Sample data only. No live orders or financial records.");
  }
  async function print(key: string) {
    if (demo) {
      window.print();
      return;
    }
    try {
      const r = await fetch("/api/admin/print", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          batch_id: batch,
          order_id: docket || null,
          key: reprint ? `${key}-reprint-${crypto.randomUUID()}` : key,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.print();
      setReprint(false);
      setMessage(
        "Browser print dialog requested. Confirm physical output before reprinting.",
      );
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  const orders = data?.orders.filter((o) => o.batch_id === batch) || [],
    summary = summarize(orders),
    selected = data?.batches.find((b) => b.id === batch),
    paid = orders.filter((o) =>
      ["confirmed", "preparing", "packed", "dispatched", "collected"].includes(
        o.status,
      ),
    );
  return (
    <main className="page-shell">
      <div className="eyebrow">RM OPERATIONS · TUESDAY, SORTED</div>
      <h1>Kitchen & admin.</h1>
      {!data ? (
        <div className="auth-box">
          <h2>Admin sign in</h2>
          <p>
            Access is verified against the private administrator register on
            every request.
          </p>
          <form onSubmit={login}>
            <label>
              Email
              <input type="email" name="email" required autoComplete="email" />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button className="button lime full" disabled={busy}>
              Sign in securely ↗
            </button>
          </form>
          <button className="secondary full" onClick={sample}>
            Explore sample kitchen
          </button>
        </div>
      ) : (
        <>
          {demo && (
            <p className="notice no-print">
              SAMPLE WORKSPACE · Fictional orders. Editing and physical printer
              integration are disabled.
            </p>
          )}
          <div
            className="no-print"
            style={{
              display: "flex",
              gap: 20,
              alignItems: "end",
              flexWrap: "wrap",
            }}
          >
            <label>
              Production week
              <select
                value={batch}
                onChange={(e) => {
                  setBatch(e.target.value);
                  setDocket("");
                }}
              >
                {data.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.production_date} · {b.suspended ? "paused" : "open"}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              onClick={() => {
                setData(null);
                setDemo(false);
                if (!demo)
                  authClient()
                    .auth.signOut()
                    .catch(() => {});
              }}
            >
              Leave workspace
            </button>
            <label>
              <input
                type="checkbox"
                checked={reprint}
                onChange={(e) => setReprint(e.target.checked)}
                style={{ width: 16, display: "inline" }}
              />{" "}
              Explicit reprint
            </label>
            <button
              className="secondary"
              onClick={() => print(`${batch}-${tab}-${docket || "all"}`)}
            >
              Print {tab === "Dockets" ? "packing docket" : "production sheet"}{" "}
              ↗
            </button>
          </div>
          <div className="print-only">
            <h2>RM — Tuesday production · {selected?.production_date}</h2>
            <p>Rune, Geelong → CrossFit Ocean Grove</p>
          </div>
          <div className="tabs">
            {[
              "Overview",
              "Orders",
              "Kitchen",
              "Dockets",
              "Meals & pricing",
              "Calendar",
              "Print jobs",
            ].map((t) => (
              <button
                className={tab === t ? "active" : ""}
                key={t}
                onClick={() => {
                  setTab(t);
                  setDocket("");
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Overview" && (
            <>
              <div className="stats">
                {[
                  ["Paid orders", summary.orders],
                  ["Meals to prepare", summary.meals],
                  ["Paid revenue", money(summary.revenue)],
                  [
                    "Collected",
                    paid.filter((o) => o.status === "collected").length,
                  ],
                ].map(([l, v]) => (
                  <div className="stat" key={l}>
                    <span>{l}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <h2>Production by recipe</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>RECIPE</th>
                      <th>QUANTITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.meals.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>
                          <b>{summary.quantities[m.id] || 0}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="notice">
                Only payment-confirmed orders appear in production totals.
                Pending checkouts are excluded.
              </p>
            </>
          )}
          {tab === "Orders" && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CUSTOMER</th>
                    <th>PACK CONTENTS</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <b>{o.customer_name}</b>
                        <p>
                          {o.customer_email}
                          <br />
                          {o.customer_phone}
                        </p>
                        <small>{o.id.slice(0, 8)}</small>
                      </td>
                      <td>
                        {o.order_items.map((i) => (
                          <p key={i.meal_id}>
                            {i.quantity} ×{" "}
                            {data.meals.find((m) => m.id === i.meal_id)?.name}
                          </p>
                        ))}
                      </td>
                      <td>{money(o.total_cents)}</td>
                      <td>
                        {["pending", "expired", "cancelled"].includes(
                          o.status,
                        ) ? (
                          o.status
                        ) : (
                          <select
                            disabled={busy}
                            aria-label={"Status for " + o.customer_name}
                            value={o.status}
                            onChange={(e) => {
                              if (demo)
                                setData({
                                  ...data,
                                  orders: data.orders.map((x) =>
                                    x.id === o.id
                                      ? { ...x, status: e.target.value }
                                      : x,
                                  ),
                                });
                              else
                                update({
                                  kind: "order",
                                  id: o.id,
                                  status: e.target.value,
                                });
                            }}
                          >
                            {[
                              "confirmed",
                              "preparing",
                              "packed",
                              "dispatched",
                              "collected",
                            ].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!orders.length && <p>No orders for this production week.</p>}
            </div>
          )}
          {tab === "Kitchen" && (
            <>
              <p>
                {summary.meals} meals · {summary.orders} customers · Cooked at
                Rune
              </p>
              <div className="kitchen-grid">
                {data.meals.map((m) => (
                  <div className="kitchen-card" key={m.id}>
                    <div className="eyebrow">MEALS TO PREPARE</div>
                    <strong>{summary.quantities[m.id] || 0}</strong>
                    <h3>{m.name}</h3>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "Dockets" && (
            <>
              <label className="no-print">
                Customer
                <select
                  value={docket}
                  onChange={(e) => setDocket(e.target.value)}
                >
                  <option value="">All packing dockets</option>
                  {paid.map((o) => (
                    <option value={o.id} key={o.id}>
                      {o.customer_name}
                    </option>
                  ))}
                </select>
              </label>
              {paid
                .filter((o) => !docket || o.id === docket)
                .map((o) => (
                  <article className="docket" key={o.id}>
                    <div className="eyebrow">RM — CUSTOMER PACKING DOCKET</div>
                    <h2>{o.customer_name}</h2>
                    <p>{selected?.production_date} · CrossFit Ocean Grove</p>
                    <p>
                      Order {o.id.slice(0, 8)} · {o.status} · {o.customer_phone}
                    </p>
                    {o.order_items.map((i) => (
                      <h3 key={i.meal_id}>
                        □ {i.quantity} ×{" "}
                        {data.meals.find((m) => m.id === i.meal_id)?.name}
                      </h3>
                    ))}
                    <p>Packed by: __________________</p>
                    <p>Collected by / time: __________________</p>
                  </article>
                ))}
            </>
          )}
          {tab === "Meals & pricing" && (
            <div className="settings-grid">
              {data.meals.map((m) => (
                <form
                  className="settings-panel"
                  key={m.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    update({
                      kind: "meal",
                      id: m.id,
                      name: f.get("name"),
                      description: f.get("description"),
                      ingredients: f.get("ingredients"),
                      allergens: f.get("allergens"),
                      active: f.get("active") === "on",
                    });
                  }}
                >
                  <h3>{m.name}</h3>
                  {(
                    ["name", "description", "ingredients", "allergens"] as const
                  ).map((k) => (
                    <label key={k}>
                      {k}
                      <input name={k} defaultValue={m[k]} required />
                    </label>
                  ))}
                  <label>
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={m.active}
                      style={{ display: "inline", width: 16 }}
                    />{" "}
                    Available to order
                  </label>
                  <p className="notice">Nutrition remains unverified.</p>
                  <button className="secondary" disabled={busy}>
                    Save meal
                  </button>
                </form>
              ))}
              {data.packs.map((p) => (
                <form
                  className="settings-panel"
                  key={p.size}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    update({
                      kind: "pack",
                      size: p.size,
                      price: Math.round(Number(f.get("price")) * 100),
                    });
                  }}
                >
                  <h3>{p.size}RM pack price</h3>
                  <label>
                    AUD
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      defaultValue={p.price / 100}
                      required
                    />
                  </label>
                  <button className="secondary" disabled={busy}>
                    Save price
                  </button>
                </form>
              ))}
            </div>
          )}
          {tab === "Calendar" && (
            <div className="settings-grid">
              {data.batches.map((b) => (
                <form
                  className="settings-panel"
                  key={b.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    update({
                      kind: "batch",
                      id: b.id,
                      cutoff_at: fromZonedTime(
                        String(f.get("cutoff")),
                        ZONE,
                      ).toISOString(),
                      pickup_at: fromZonedTime(
                        String(f.get("pickup")),
                        ZONE,
                      ).toISOString(),
                      capacity: Number(f.get("capacity")),
                      meal_caps: Object.fromEntries(
                        data.meals
                          .filter((m) => f.get(`cap-${m.id}`) !== "")
                          .map((m) => [m.id, Number(f.get(`cap-${m.id}`))]),
                      ),
                      suspended: f.get("suspended") === "on",
                    });
                  }}
                >
                  <h3>Tuesday {b.production_date}</h3>
                  <p>All times Australia/Melbourne</p>
                  <label>
                    Order cutoff
                    <input
                      type="datetime-local"
                      name="cutoff"
                      defaultValue={formatInTimeZone(
                        new Date(b.cutoff_at),
                        ZONE,
                        "yyyy-MM-dd'T'HH:mm",
                      )}
                      required
                    />
                  </label>
                  <label>
                    Pickup
                    <input
                      type="datetime-local"
                      name="pickup"
                      defaultValue={formatInTimeZone(
                        new Date(b.pickup_at),
                        ZONE,
                        "yyyy-MM-dd'T'HH:mm",
                      )}
                      required
                    />
                  </label>
                  <label>
                    Maximum meals
                    <input
                      type="number"
                      name="capacity"
                      min="0"
                      defaultValue={b.capacity}
                      required
                    />
                  </label>
                  {data.meals.map((m) => (
                    <label key={m.id}>
                      Recipe cap · {m.name}
                      <input
                        name={`cap-${m.id}`}
                        type="number"
                        min="0"
                        placeholder="No recipe cap"
                        defaultValue={b.meal_caps?.[m.id] ?? ""}
                      />
                    </label>
                  ))}
                  <label>
                    <input
                      type="checkbox"
                      name="suspended"
                      defaultChecked={b.suspended}
                      style={{ display: "inline", width: 16 }}
                    />{" "}
                    Suspend orders
                  </label>
                  <button className="secondary" disabled={busy}>
                    Save production week
                  </button>
                </form>
              ))}
              <form
                className="settings-panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  update(
                    {
                      production_date: f.get("date"),
                      cutoff_at: fromZonedTime(
                        String(f.get("cutoff")),
                        ZONE,
                      ).toISOString(),
                      pickup_at: fromZonedTime(
                        String(f.get("pickup")),
                        ZONE,
                      ).toISOString(),
                      capacity: Number(f.get("capacity")),
                    },
                    "POST",
                  );
                }}
              >
                <h3>Add production Tuesday</h3>
                <p>All times Australia/Melbourne</p>
                <label>
                  Production date
                  <input type="date" name="date" required />
                </label>
                <label>
                  Cutoff
                  <input type="datetime-local" name="cutoff" required />
                </label>
                <label>
                  Pickup
                  <input type="datetime-local" name="pickup" required />
                </label>
                <label>
                  Meal capacity
                  <input
                    type="number"
                    name="capacity"
                    min="1"
                    defaultValue={200}
                    required
                  />
                </label>
                <button className="secondary" disabled={busy}>
                  Add week
                </button>
              </form>
            </div>
          )}
          {tab === "Print jobs" && (
            <>
              <p className="notice">
                Lightspeed printing is disabled. Browser print jobs record that
                a dialog was requested; physical printer success cannot be
                verified by the browser. Reprints need a new explicit attempt.
                Jobs with unknown remote state must be reconciled before
                resubmission.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>DOCUMENT</th>
                    <th>STATUS</th>
                    <th>ATTEMPTS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((j) => (
                    <tr key={j.id}>
                      <td>{j.document_key}</td>
                      <td>{j.status}</td>
                      <td>{j.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
      <p className="no-print" role="status">
        {message}
      </p>
    </main>
  );
}
