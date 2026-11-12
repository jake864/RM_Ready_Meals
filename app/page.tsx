import Storefront from "@/components/Storefront";
import { db } from "@/lib/server";
import { meals, packs } from "@/lib/catalog";
import { nextBatch } from "@/lib/domain";
export const dynamic = "force-dynamic";
export default async function Page() {
  let menu = meals,
    config = packs,
    batch = { ...nextBatch(), id: "", suspended: false };
  try {
    const d = db();
    const [m, p, b] = await Promise.all([
      d.from("meals").select("*").eq("active", true).order("sort_order"),
      d.from("pack_configurations").select("*").order("size"),
      d
        .from("production_batches")
        .select("*")
        .gt("cutoff_at", new Date().toISOString())
        .order("production_date")
        .limit(1),
    ]);
    if (m.data?.length) menu = m.data;
    if (p.data?.length) config = p.data;
    if (b.data?.[0])
      batch = {
        id: b.data[0].id,
        production: b.data[0].production_date,
        cutoff: b.data[0].cutoff_at,
        pickup: b.data[0].pickup_at,
        suspended: b.data[0].suspended,
      };
  } catch {}
  return <Storefront menu={menu} packs={config} batch={batch} />;
}
