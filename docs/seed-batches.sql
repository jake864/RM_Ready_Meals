-- Run after initial migration in the NEW RM project only.
insert into public.production_batches(production_date,cutoff_at,pickup_at,pickup_location_id)
select d::date,((d::date-2)::text||' 20:00:00')::timestamp at time zone 'Australia/Melbourne',(d::date::text||' 17:00:00')::timestamp at time zone 'Australia/Melbourne',(select id from public.pickup_locations where name='CrossFit Ocean Grove' limit 1)
from generate_series(current_date,current_date+interval '90 days',interval '1 day')d
where extract(isodow from d)=2 and ((d::date-2)::text||' 20:00:00')::timestamp at time zone 'Australia/Melbourne'>now()
on conflict(production_date) do nothing;
