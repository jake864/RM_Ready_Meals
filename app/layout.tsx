import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
export const metadata: Metadata = {
  title: "RM — Ready Meals | Fuel Your Next Rep.",
  description:
    "Proper food for the work you put in. Fresh ready meals, made in Geelong. Mix your pack and collect at CrossFit Ocean Grove.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <div className="announcement">
          BUILT FOR YOUR WEEK. MADE IN GEELONG.{" "}
          <span>PREVIEW · CHECKOUT IN TEST MODE</span>
        </div>
        <header>
          <Link className="brand" href="/">
            RM
            <span>
              READY
              <br />
              MEALS
            </span>
            <i>®</i>
          </Link>
          <nav>
            <Link href="/#menu">The menu</Link>
            <Link href="/#how">How it works</Link>
            <Link href="/account">
              My orders <ArrowUpRight size={14} />
            </Link>
          </nav>
          <Link className="header-cta" href="/#menu">
            Build your pack <ShoppingBag size={16} />
          </Link>
        </header>
        {children}
        <footer>
          <Link className="brand" href="/">
            RM
            <span>
              READY
              <br />
              MEALS
            </span>
          </Link>
          <p>
            Real food. Ready when you are.
            <br />
            <small>
              Made at Rune, Geelong. Collected at CrossFit Ocean Grove.
            </small>
          </p>
          <Link href="/admin">Kitchen & admin ↗</Link>
          <span>© {new Date().getFullYear()} RM — Ready Meals</span>
        </footer>
      </body>
    </html>
  );
}
