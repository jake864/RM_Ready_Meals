import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const sql = readFileSync(
  "supabase/migrations/20261112071332_initial_rm_schema.sql",
  "utf8",
);
test("migrations, reservations, RLS, payment idempotency, and fulfillment", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
    );
    await pg.exec(sql);
    await pg.exec(readFileSync("docs/seed-batches.sql", "utf8"));
    const rls = await pg.query<{ n: number }>(
      `select count(*)::int n from pg_tables where schemaname='public' and rowsecurity`,
    );
    assert.equal(rls.rows[0].n, 14);
    await pg.exec(`set role anon;`);
    assert.equal((await pg.query(`select * from meals`)).rows.length, 4);
    await assert.rejects(pg.query("select * from orders"), /permission denied/);
    await assert.rejects(
      pg.query(`select reserve_order(null,null,null,null,null,null,null,null)`),
      /permission denied/,
    );
    await pg.exec("reset role");
    const b = await pg.query<{ id: string }>(
      `insert into production_batches(production_date,cutoff_at,pickup_at,capacity) values('2099-11-17','2099-11-15T09:00:00Z','2099-11-17T06:00:00Z',5) returning id`,
    );
    const batch = b.rows[0].id;
    const id = "11111111-1111-4111-8111-111111111111";
    await pg.exec("set role service_role");
    const reserve = (
      key: string,
      size = 3,
      items = '[{"meal_id":"ragu","quantity":3}]',
    ) =>
      pg.query<{ o: { id: string; total_cents: number } }>(
        `select reserve_order($1,'fingerprint',$2,$3,'Test Customer','test@example.test','0400000000',$4::jsonb) o`,
        [key, batch, size, items],
      );
    const order = (await reserve(id)).rows[0].o;
    assert.equal(order.total_cents, 4200);
    assert.equal((await reserve(id)).rows[0].o.id, order.id);
    await assert.rejects(
      reserve("22222222-2222-4222-8222-222222222222"),
      /capacity/,
    );
    await assert.rejects(
      reserve(
        "33333333-3333-4333-8333-333333333333",
        3,
        '[{"meal_id":"ragu","quantity":2}]',
      ),
      /quantities/,
    );
    await assert.rejects(
      reserve(
        "33333333-3333-4333-8333-333333333333",
        3,
        '[{"meal_id":"unknown","quantity":3}]',
      ),
      /Invalid meal/,
    );
    await pg.query(
      `update production_batches set meal_caps='{"nasi":0}' where id=$1`,
      [batch],
    );
    await assert.rejects(
      reserve(
        "66666666-6666-4666-8666-666666666666",
        1,
        '[{"meal_id":"nasi","quantity":1}]',
      ),
      /Recipe has reached capacity/,
    );
    await pg.query(`update production_batches set suspended=true where id=$1`, [
      batch,
    ]);
    await assert.rejects(
      reserve(
        "66666666-6666-4666-8666-666666666666",
        1,
        '[{"meal_id":"ragu","quantity":1}]',
      ),
      /closed/,
    );
    await pg.query(
      `update production_batches set suspended=false where id=$1`,
      [batch],
    );
    await assert.rejects(
      pg.query(
        `select confirm_payment('evt_wrong_currency','cs_test_1',$1,4200,'usd','pi_wrong')`,
        [order.id],
      ),
      /does not match/,
    );
    await pg.query(
      `update orders set stripe_session_id='cs_test_1' where id=$1`,
      [order.id],
    );
    const confirm = (event: string, amount = 4200) =>
      pg.query(
        `select confirm_payment($1,'cs_test_1',$2,$3,'aud','pi_test_1')`,
        [event, order.id, amount],
      );
    await assert.rejects(confirm("evt_wrong", 1), /does not match/);
    await confirm("evt_1");
    await confirm("evt_1");
    await confirm("evt_2");
    assert.equal((await pg.query(`select * from payments`)).rows.length, 1);
    assert.equal(
      (await pg.query<{ status: string }>(`select status from orders`)).rows[0]
        .status,
      "confirmed",
    );
    await pg.query(`update orders set status='collected' where id=$1`, [
      order.id,
    ]);
    assert.ok(
      (
        await pg.query<{ collected_at: string }>(
          `select collected_at from deliveries`,
        )
      ).rows[0].collected_at,
    );
    await pg.exec("reset role");
    const user = "44444444-4444-4444-8444-444444444444";
    await pg.query(
      `insert into auth.users values($1,'test@example.test',now())`,
      [user],
    );
    await pg.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`,
    );
    assert.equal((await pg.query("select * from orders")).rows.length, 1);
    await assert.rejects(
      pg.query(`update orders set status='confirmed'`),
      /permission denied/,
    );
    await pg.exec(
      `select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',false)`,
    );
    assert.equal((await pg.query("select * from orders")).rows.length, 0);
    assert.equal((await pg.query("select * from order_items")).rows.length, 0);
  } finally {
    await pg.close();
  }
});
