"use client";
import { useState } from "react";
import { authClient, authHeaders } from "@/lib/client";
import { money } from "@/lib/catalog";
type Order = {
  id: string;
  status: string;
  total_cents: number;
  production_batches: { production_date: string };
  order_items: { quantity: number; meals: { name: string } }[];
};
export default function Account() {
  const [message, setMessage] = useState(""),
    [orders, setOrders] = useState<Order[]>([]),
    [signed, setSigned] = useState(false),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/orders", { headers: await authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setOrders(d);
    setSigned(true);
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
      setMessage("Signed in securely.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signup(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form?.reportValidity()) return;
    setBusy(true);
    try {
      const f = new FormData(form);
      const { error } = await authClient().auth.signUp({
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      if (error) throw error;
      setMessage("Check your email to verify your account, then sign in.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-shell">
      <div className="eyebrow">YOUR FUEL, ON RECORD</div>
      <h1>My orders.</h1>
      <p>
        Guest checkout comes first. Create an optional account using the same
        verified email to see your orders.
      </p>
      {!signed ? (
        <form className="auth-box" onSubmit={login}>
          <h2>Welcome back.</h2>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={10}
              required
            />
          </label>
          <button className="button lime full" disabled={busy}>
            Sign in ↗
          </button>
          <button
            type="button"
            className="secondary full"
            disabled={busy}
            onClick={signup}
          >
            Create an account
          </button>
        </form>
      ) : (
        <>
          <button
            className="secondary"
            onClick={async () => {
              await authClient().auth.signOut();
              setSigned(false);
              setOrders([]);
            }}
          >
            Sign out
          </button>
          {!orders.length && (
            <p>No orders yet. Use your checkout email for your account.</p>
          )}
          {orders.map((o) => (
            <div className="docket" key={o.id}>
              <b>
                {o.production_batches.production_date} · {o.status}
              </b>
              {o.order_items.map((i, n) => (
                <p key={n}>
                  {i.quantity} × {i.meals.name}
                </p>
              ))}
              <strong>{money(o.total_cents)}</strong>
              <p>Order {o.id.slice(0, 8)}</p>
            </div>
          ))}
        </>
      )}
      <p role="status">{message}</p>
    </main>
  );
}
