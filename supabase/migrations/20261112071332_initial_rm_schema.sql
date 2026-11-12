-- RM standalone schema. Apply only to a NEW RM project.
create table public.customers(id uuid primary key default gen_random_uuid(),user_id uuid unique references auth.users(id),email text not null,name text not null,phone text not null,created_at timestamptz not null default now());
create unique index customers_email_lower on public.customers(lower(email));
create table public.meals(id text primary key,name text not null,subtitle text not null,description text not null,ingredients text not null,allergens text not null,image text not null,tag text not null,active boolean not null default true,sort_order int not null default 0);
create table public.meal_ingredients(id uuid primary key default gen_random_uuid(),meal_id text not null references public.meals(id),name text not null,allergen text);
create index meal_ingredients_meal on public.meal_ingredients(meal_id);
create table public.meal_nutrition(meal_id text primary key references public.meals(id),values_json jsonb not null default '{}',verified boolean not null default false,verified_at timestamptz,check(not verified or verified_at is not null));
create table public.pack_configurations(size int primary key check(size in(1,3,5)),price int not null check(price>0),label text not null,note text not null);
create table public.pickup_locations(id uuid primary key default gen_random_uuid(),name text not null,address text,active boolean not null default true);
create table public.production_batches(id uuid primary key default gen_random_uuid(),production_date date not null unique check(extract(isodow from production_date)=2),cutoff_at timestamptz not null,pickup_at timestamptz not null,suspended boolean not null default false,capacity int not null default 200 check(capacity>=0),meal_caps jsonb not null default '{}',pickup_location_id uuid references public.pickup_locations(id),check(cutoff_at<pickup_at),check((cutoff_at at time zone 'Australia/Melbourne')::date<production_date),check((pickup_at at time zone 'Australia/Melbourne')::date=production_date));
create index batches_pickup_location on public.production_batches(pickup_location_id);
create table public.orders(id uuid primary key default gen_random_uuid(),idempotency_key uuid not null unique,fingerprint text not null,customer_id uuid references auth.users(id),customer_record_id uuid not null references public.customers(id),batch_id uuid not null references public.production_batches(id),customer_name text not null,customer_email text not null,customer_phone text not null,pack_size int not null references public.pack_configurations(size),total_cents int not null check(total_cents>0),status text not null default 'pending' check(status in('pending','expired','confirmed','preparing','packed','dispatched','collected','cancelled')),reserved_until timestamptz not null default(now()+interval '35 minutes'),stripe_session_id text unique,created_at timestamptz not null default now());
create index orders_customer on public.orders(customer_id);create index orders_customer_record on public.orders(customer_record_id);create index orders_batch_status on public.orders(batch_id,status);create index orders_pack on public.orders(pack_size);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,meal_id text not null references public.meals(id),quantity int not null check(quantity>0 and quantity<=5),unique(order_id,meal_id));
create index order_items_meal on public.order_items(meal_id);
create table public.payments(id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.orders(id),stripe_intent text unique,stripe_session text not null unique,amount_cents int not null check(amount_cents>0),currency text not null check(currency='aud'),created_at timestamptz not null default now());
create table public.payment_events(event_id text primary key,order_id uuid not null references public.orders(id),created_at timestamptz not null default now());create index payment_events_order on public.payment_events(order_id);
create table public.deliveries(id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.orders(id),dispatched_at timestamptz,collected_at timestamptz,notes text);
create table public.admin_users(user_id uuid primary key references auth.users(id),created_at timestamptz not null default now());
create table public.print_jobs(id uuid primary key default gen_random_uuid(),batch_id uuid not null references public.production_batches(id),order_id uuid references public.orders(id),document_key text not null unique,status text not null default 'queued' check(status in('queued','submitted','failed','unknown','browser_dialog_opened')),attempts int not null default 0,provider text not null default 'browser',last_error text,created_at timestamptz not null default now());create index print_jobs_batch on public.print_jobs(batch_id);create index print_jobs_order on public.print_jobs(order_id);
-- Every table is RLS protected. Private operations use server-only secret keys.
do $$ declare t text;begin foreach t in array array['customers','meals','meal_ingredients','meal_nutrition','pack_configurations','pickup_locations','production_batches','orders','order_items','payments','payment_events','deliveries','admin_users','print_jobs'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
grant select on public.meals,public.meal_ingredients,public.meal_nutrition,public.pack_configurations,public.pickup_locations to anon,authenticated;
create policy meals_public on public.meals for select to anon,authenticated using(active);
create policy ingredients_public on public.meal_ingredients for select to anon,authenticated using(exists(select 1 from public.meals where id=meal_id and active));
create policy nutrition_verified on public.meal_nutrition for select to anon,authenticated using(verified);
create policy packs_public on public.pack_configurations for select to anon,authenticated using(true);
create policy pickup_public on public.pickup_locations for select to anon,authenticated using(active);
grant select on public.orders,public.order_items,public.customers to authenticated;
create policy own_orders on public.orders for select to authenticated using(customer_id=(select auth.uid()));
create policy own_items on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));
create policy own_customer on public.customers for select to authenticated using(user_id=(select auth.uid()));
-- Verified account email claims guest orders server-side; clients cannot alter ownership.
create function public.claim_customer_orders() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.email_confirmed_at is not null then
 insert into public.customers(user_id,email,name,phone) values(new.id,lower(new.email),'Account customer','') on conflict(lower(email)) do nothing;
 update public.customers set user_id=new.id where lower(email)=lower(new.email) and (user_id is null or user_id=new.id);
 update public.orders set customer_id=new.id where lower(customer_email)=lower(new.email) and customer_id is null;
 end if;return new;end $$;
revoke all on function public.claim_customer_orders() from public,anon,authenticated;
create trigger rm_claim_orders after insert or update of email_confirmed_at on auth.users for each row execute function public.claim_customer_orders();
-- Batch row lock serializes capacity decisions; reserve inventory before payment.
create function public.reserve_order(p_key uuid,p_fingerprint text,p_batch uuid,p_size int,p_name text,p_email text,p_phone text,p_items jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.production_batches; o public.orders; price int; amount int; used int; cap int; item jsonb; customer uuid; account uuid;
begin
 select * into b from public.production_batches where id=p_batch for update;
 if not found then raise exception 'Production batch not found';end if;
 select * into o from public.orders where idempotency_key=p_key;
 if found then if o.fingerprint<>p_fingerprint then raise exception 'Pack changed. Start a new checkout attempt.';end if;if o.status<>'pending' or o.reserved_until<=now()+interval '1 minute' then raise exception 'Checkout already completed or expired. Start a new attempt.';end if;return to_jsonb(o);end if;
 if b.suspended or now()>=b.cutoff_at then raise exception 'Orders are closed for this batch';end if;
 select pc.price into price from public.pack_configurations pc where pc.size=p_size;
 if price is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Invalid pack';end if;
 if exists(select 1 from jsonb_array_elements(p_items) i where (i->>'quantity')::numeric<>(i->>'quantity')::int or (i->>'quantity')::int<=0 or not exists(select 1 from public.meals m where m.id=i->>'meal_id' and m.active)) then raise exception 'Invalid meal quantity';end if;
 select sum((i->>'quantity')::int) into amount from jsonb_array_elements(p_items) i;
 if amount<>p_size or (select count(distinct i->>'meal_id') from jsonb_array_elements(p_items)i)<>jsonb_array_length(p_items) then raise exception 'Pack quantities do not match';end if;
 select coalesce(sum(oi.quantity),0) into used from public.order_items oi join public.orders ord on ord.id=oi.order_id where ord.batch_id=p_batch and (ord.status in('confirmed','preparing','packed','dispatched','collected') or ord.status='pending');
 if used+amount>b.capacity then raise exception 'This batch is at capacity';end if;
 for item in select value from jsonb_array_elements(p_items) loop
 cap:=(b.meal_caps->>(item->>'meal_id'))::int;
 if cap is not null then select coalesce(sum(oi.quantity),0) into used from public.order_items oi join public.orders ord on ord.id=oi.order_id where ord.batch_id=p_batch and oi.meal_id=item->>'meal_id' and (ord.status in('confirmed','preparing','packed','dispatched','collected') or ord.status='pending');if used+(item->>'quantity')::int>cap then raise exception 'Recipe has reached capacity';end if;end if;
 end loop;
 select user_id into account from public.customers where lower(email)=lower(p_email);
 insert into public.customers(email,name,phone,user_id) values(lower(p_email),p_name,p_phone,account) on conflict(lower(email)) do update set name=excluded.name,phone=excluded.phone returning id into customer;
 insert into public.orders(idempotency_key,fingerprint,customer_id,customer_record_id,batch_id,customer_name,customer_email,customer_phone,pack_size,total_cents) values(p_key,p_fingerprint,account,customer,p_batch,p_name,lower(p_email),p_phone,p_size,price) returning * into o;
 insert into public.order_items(order_id,meal_id,quantity) select o.id,i->>'meal_id',(i->>'quantity')::int from jsonb_array_elements(p_items)i;
 return to_jsonb(o);
end $$;
revoke all on function public.reserve_order(uuid,text,uuid,int,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_order(uuid,text,uuid,int,text,text,text,jsonb) to service_role;
-- Signature verification is performed by the route; financial checks repeat in SQL.
create function public.confirm_payment(p_event text,p_session text,p_order uuid,p_amount int,p_currency text,p_intent text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.orders;begin
 select * into o from public.orders where id=p_order for update;
 if not found or o.stripe_session_id is distinct from p_session or o.total_cents<>p_amount or p_currency<>'aud' then raise exception 'Payment does not match order';end if;
 if exists(select 1 from public.payment_events where event_id=p_event) then return;end if;
 insert into public.payments(order_id,stripe_intent,stripe_session,amount_cents,currency) values(o.id,p_intent,p_session,p_amount,p_currency) on conflict(order_id) do nothing;
 update public.orders set status='confirmed' where id=o.id and status='pending';
 insert into public.payment_events(event_id,order_id) values(p_event,o.id);
 insert into public.deliveries(order_id) values(o.id) on conflict(order_id) do nothing;
end $$;
revoke all on function public.confirm_payment(text,text,uuid,int,text,text) from public,anon,authenticated;
grant execute on function public.confirm_payment(text,text,uuid,int,text,text) to service_role;
create function public.track_fulfillment() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.status='dispatched' then update public.deliveries set dispatched_at=coalesce(dispatched_at,now()) where order_id=new.id;end if;
 if new.status='collected' then update public.deliveries set collected_at=coalesce(collected_at,now()) where order_id=new.id;end if;return new;end $$;
revoke all on function public.track_fulfillment() from public,anon,authenticated;
create trigger order_fulfillment after update of status on public.orders for each row execute function public.track_fulfillment();
insert into public.pack_configurations values(1,1500,'The single','Try your next favourite'),(3,4200,'The midweek','Three meals. Zero prep.'),(5,6500,'The weekly','Your week, taken care of');
insert into public.pickup_locations(name) values('CrossFit Ocean Grove');

insert into public.meals(id,name,subtitle,description,ingredients,allergens,image,tag,sort_order) values
('ragu','Beef Ragu Protein Pasta','SLOW COOKED. FAST FUEL.','Rich, slow-braised beef in a tomato ragu, tossed through protein pasta. Your post-session comfort food.','Beef, wheat protein pasta, tomato, onion, garlic, olive oil, herbs, parmesan.','Wheat (gluten), milk. Recipe and cross-contact information awaiting kitchen approval.','/ragu.jpg','THE CROWD FAVOURITE',0),
('kecap','Ayam Kecap Chicken & Rice','SWEET. SAVOURY. STRONG.','Indonesian-style chicken glazed with sweet soy, served with fluffy rice and seasonal greens.','Chicken, rice, kecap manis, soy sauce, garlic, ginger, seasonal greens.','Soy, wheat (gluten). Recipe and cross-contact information awaiting kitchen approval.','/chicken.jpg','INDONESIAN INSPIRED',1),
('rendang','Beef Rendang & Rice','LOW AND SLOW. BIG ON FLAVOUR.','Tender beef simmered in fragrant coconut, lemongrass and warming spices, with steamed rice.','Beef, coconut milk, rice, lemongrass, chilli, ginger, garlic, spices.','Recipe and cross-contact information awaiting kitchen approval.','/rendang.jpg','SLOW-COOKED CLASSIC',2),
('nasi','High-Protein Nasi Goreng','YOUR NEW WEEKLY REGULAR.','A satisfying Indonesian fried rice with chicken, egg and vegetables, finished with sweet soy.','Rice, chicken, egg, vegetables, kecap manis, soy, garlic, spring onion.','Egg, soy, wheat (gluten). Recipe and cross-contact information awaiting kitchen approval.','/nasi.jpg','BIG SESSION ENERGY',3);
insert into public.meal_nutrition(meal_id) select id from public.meals;
