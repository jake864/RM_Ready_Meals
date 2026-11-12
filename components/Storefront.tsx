"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  Check,
  Clock,
  MapPin,
  X,
  Flame,
  Utensils,
  ChevronDown,
} from "lucide-react";
import { Meal, money } from "@/lib/catalog";
import { formatInTimeZone } from "date-fns-tz";
import { ZONE } from "@/lib/domain";
export default function Storefront({
  menu,
  packs,
  batch,
}: {
  menu: Meal[];
  packs: { size: number; price: number; label: string; note: string }[];
  batch: {
    id: string;
    production: string;
    cutoff: string;
    pickup: string;
    suspended: boolean;
  };
}) {
  const [size, setSize] = useState(3),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [detail, setDetail] = useState<Meal | null>(null),
    [checkout, setCheckout] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!detail && !checkout) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>("[role=dialog]");
    const focusables = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,a[href]",
        ) || [],
      );
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDetail(null);
        setCheckout(false);
      }
      if (e.key === "Tab") {
        const f = focusables(),
          first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [detail, checkout]);
  const count = Object.values(counts).reduce((a, b) => a + b, 0),
    pack = packs.find((p) => p.size === size)!;
  const date = formatInTimeZone(new Date(batch.pickup), ZONE, "EEE d MMM");
  function adjust(id: string, d: number) {
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));
  }
  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const fingerprint = JSON.stringify([
      size,
      counts,
      batch.id,
      f.get("name"),
      f.get("email"),
      f.get("phone"),
    ]);
    let key = sessionStorage.getItem("rm-checkout-key");
    if (!key || sessionStorage.getItem("rm-cart") !== fingerprint) {
      key = crypto.randomUUID();
      sessionStorage.setItem("rm-checkout-key", key);
      sessionStorage.setItem("rm-cart", fingerprint);
    }
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          pack_size: size,
          batch_id: batch.id,
          items: Object.entries(counts)
            .filter(([, q]) => q > 0)
            .map(([meal_id, quantity]) => ({ meal_id, quantity })),
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="dot" /> REAL FOOD. REAL PERFORMANCE.
          </div>
          <h1>
            FUEL YOUR
            <br />
            NEXT <em>REP.</em>
          </h1>
          <p>
            You put in the work. We’ll take care of the food.
            <br />
            Fresh, flavour-packed meals built for life outside the box.
          </p>
          <a className="button lime" href="#menu">
            Find your fuel <ArrowUpRight size={20} />
          </a>
          <div className="hero-facts">
            <span>
              <Check size={15} /> Cooked fresh weekly
            </span>
            <span>
              <Check size={15} /> No subscription
            </span>
            <span>
              <Check size={15} /> Locally made
            </span>
          </div>
        </div>
        <div className="hero-image">
          <Image
            src="/hero.jpg"
            alt="A fresh, colourful ready meal with chicken, rice and greens"
            width={1400}
            height={1100}
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div className="photo-overlay" />
          <div className="round-badge">
            LESS PREP.
            <br />
            <ArrowUpRight size={32} />
            <br />
            MORE LIFE.
          </div>
          <div className="image-caption">
            <span>GOOD FOOD. ZERO GUESSWORK.</span>
            <span>01 / 04</span>
          </div>
        </div>
        <div className="hero-bottom">
          <span>MADE FOR THE EVERYDAY ATHLETE</span>
          <span>SCROLL TO GET STARTED ↓</span>
        </div>
      </section>
      <div className="ticker">
        <span>PREP LESS.</span> ✳ <span>TRAIN HARD.</span> ✳{" "}
        <span>EAT WELL.</span> ✳ <span>REPEAT.</span> ✳ <span>PREP LESS.</span>{" "}
        ✳ <span>TRAIN HARD.</span> ✳
      </div>
      <section className="order-strip">
        <div>
          <Clock size={21} />
          <span>
            ORDER BY
            <strong>
              {formatInTimeZone(new Date(batch.cutoff), ZONE, "EEEE, h:mm a")}
            </strong>
          </span>
        </div>
        <div>
          <Utensils size={21} />
          <span>
            COOKED FRESH<strong>Tuesday at Rune, Geelong</strong>
          </span>
        </div>
        <div>
          <MapPin size={21} />
          <span>
            YOUR NEXT PICKUP<strong>{date} · CrossFit Ocean Grove</strong>
          </span>
        </div>
        <span className="pill">
          <span className="dot" />
          {batch.suspended ? "ORDERS PAUSED" : "NEXT BATCH OPEN"}
        </span>
      </section>
      <section className="menu-section" id="menu">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR WEEK. YOUR LINEUP.</div>
            <h2>
              Big flavour.
              <br />
              <span>Ready to go.</span>
            </h2>
          </div>
          <p>
            Four kitchen favourites. One less thing to think about.
            <br />
            Pick your pack, mix your meals, make the week yours.
          </p>
        </div>
        <div className="pack-label">
          <span>
            01 <b>CHOOSE YOUR PACK</b>
          </span>
          <small>Mix & match any meals.</small>
        </div>
        <div className="packs">
          {packs.map((p) => (
            <button
              key={p.size}
              className={"pack " + (size === p.size ? "selected" : "")}
              onClick={() => {
                setSize(p.size);
                setCounts({});
              }}
            >
              <div>
                <strong>{p.size}RM</strong>
                <span>{p.label}</span>
              </div>
              <div>
                <b>{money(p.price)}</b>
                <small>
                  {p.size} {p.size === 1 ? "meal" : "meals"} ·{" "}
                  {money(p.price / p.size)} / meal
                </small>
              </div>
              {p.size === 5 && <i>BEST VALUE</i>}
              <span className="radio">
                {size === p.size && <Check size={12} />}
              </span>
            </button>
          ))}
        </div>
        <div className="meal-label">
          <span>
            02 <b>BUILD YOUR LINEUP</b>
          </span>
          <span className="selection-count">
            {count} / {size} meals selected
          </span>
        </div>
        <div className="meal-grid">
          {menu.map((m, i) => (
            <article className="meal-card" key={m.id}>
              <button
                className="meal-photo"
                onClick={() => setDetail(m)}
                aria-label={"View " + m.name}
              >
                <Image
                  src={m.image}
                  alt={m.name}
                  width={700}
                  height={700}
                  sizes="(max-width: 1050px) 45vw, 23vw"
                />
                <span className="meal-tag">
                  {i === 0 && <Flame size={12} />} {m.tag}
                </span>
                <span className="photo-number">0{i + 1}</span>
                <span className="photo-arrow">
                  <ArrowUpRight size={21} />
                </span>
              </button>
              <div className="meal-content">
                <small>{m.subtitle}</small>
                <h3>{m.name}</h3>
                <p>{m.description}</p>
                <div className="card-bottom">
                  <button className="details" onClick={() => setDetail(m)}>
                    Ingredients & details <ChevronDown size={13} />
                  </button>
                  <div className="stepper">
                    <button
                      aria-label={"Remove " + m.name}
                      disabled={!counts[m.id]}
                      onClick={() => adjust(m.id, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <b>{counts[m.id] || 0}</b>
                    <button
                      aria-label={"Add " + m.name}
                      disabled={count >= size || batch.suspended}
                      onClick={() => adjust(m.id, 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="menu-note">
          Illustrative menu & pricing · Food photography is representative.
          Nutrition is unverified; no confirmed nutrition claims are provided.
          Ingredients and allergens require kitchen approval.
        </div>
        <div className="pack-summary">
          <div>
            <span className="eyebrow">YOUR {size}RM PACK</span>
            <strong>
              {count === size
                ? "Your week is looking good."
                : `Choose ${size - count} more ${size - count === 1 ? "meal" : "meals"} to complete your pack.`}
            </strong>
            <small>
              Collection {date} ·{" "}
              {formatInTimeZone(new Date(batch.pickup), ZONE, "h:mm a")} ·
              CrossFit Ocean Grove
            </small>
          </div>
          <b>
            {money(pack.price)} <small>AUD</small>
          </b>
          <button
            className="button lime"
            disabled={count !== size || batch.suspended}
            onClick={() => setCheckout(true)}
          >
            Review your pack <ArrowRight size={18} />
          </button>
        </div>
      </section>
      <section className="how" id="how">
        <div>
          <div className="eyebrow">LESS ADMIN. MORE LIVING.</div>
          <h2>
            Your meal prep.
            <br />
            <em>Handled.</em>
          </h2>
        </div>
        {[
          [
            "01",
            "Build your pack",
            "1RM, 3RM or 5RM. Mix and match your favourites. No subscription, no commitment.",
          ],
          [
            "02",
            "We get cooking",
            "Made fresh on Tuesday at Rune in Geelong. Proper ingredients. Big flavour.",
          ],
          [
            "03",
            "Collect. Heat. Eat.",
            "Pick up Tuesday at CrossFit Ocean Grove. Your next good meal is already sorted.",
          ],
        ].map(([n, t, d]) => (
          <div className="how-step" key={n}>
            <span>{n} ↗</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>
      <section className="closing">
        <span>YOU DO THE REPS.</span>
        <span>
          WE’LL DO THE PREP.{" "}
          <a href="#menu">
            <ArrowUpRight />
          </a>
        </span>
      </section>
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={detail.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="Close details"
              onClick={() => setDetail(null)}
            >
              <X />
            </button>
            <Image
              className="detail-img"
              src={detail.image}
              alt={detail.name}
              width={700}
              height={700}
              sizes="500px"
            />
            <h2>{detail.name}</h2>
            <p>{detail.description}</p>
            <h4>Illustrative ingredients</h4>
            <p>{detail.ingredients}</p>
            <h4>Allergen information · unverified</h4>
            <p>{detail.allergens}</p>
            <p className="notice">
              Nutrition unverified. Do not use this preview to make dietary or
              allergy decisions. Final recipe and allergen information must be
              approved before orders open.
            </p>
          </section>
        </div>
      )}
      {checkout && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Review your pack"
          >
            <button
              className="close"
              aria-label="Close checkout"
              onClick={() => setCheckout(false)}
            >
              <X />
            </button>
            <div className="eyebrow">ONE STEP CLOSER TO A GOOD WEEK</div>
            <h2>Your {size}RM pack.</h2>
            {menu
              .filter((m) => counts[m.id])
              .map((m) => (
                <div className="checkout-line" key={m.id}>
                  <span>
                    {counts[m.id]} × {m.name}
                  </span>
                  <Check size={15} />
                </div>
              ))}
            <p>
              Pickup: {date},{" "}
              {formatInTimeZone(new Date(batch.pickup), ZONE, "h:mm a")}
              <br />
              CrossFit Ocean Grove
            </p>
            <form onSubmit={pay}>
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={8}
                />
              </label>
              <div className="checkout-line">
                <strong>Total (AUD)</strong>
                <strong>{money(pack.price)}</strong>
              </div>
              <p className="notice">
                Preview only. Stripe test payments are available after setup.
                Your order is confirmed only after payment verification. No live
                payments.
              </p>
              {error && (
                <div role="alert">
                  <p className="error">{error}</p>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem("rm-checkout-key");
                      setError(
                        "New checkout attempt ready. Continue when you are ready.",
                      );
                    }}
                  >
                    Start a fresh attempt
                  </button>
                </div>
              )}
              <button className="button lime full" disabled={busy}>
                {busy ? "Preparing checkout…" : "Continue to test checkout"}{" "}
                <ArrowRight size={18} />
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
