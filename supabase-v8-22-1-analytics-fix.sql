-- Ligue 1 Express V8.22.1 — statistiques plus fiables
-- Ce script efface l'ancien historique, car il contient les robots et faux visiteurs.

alter table public.page_views add column if not exists view_key text;
create unique index if not exists page_views_view_key_unique_idx
on public.page_views (view_key) where view_key is not null;

-- Remise à zéro volontaire des anciennes statistiques non filtrées.
delete from public.page_views;

create or replace function public.analytics_summary(p_days integer default 30)
returns jsonb
language sql
security invoker
set search_path = public
as $$
with params as (
  select greatest(1, least(coalesce(p_days, 30), 365))::integer as days,
         timezone('Europe/Paris', now())::date as paris_today
), period_rows as (
  select pv.*
  from public.page_views pv, params p
  where timezone('Europe/Paris', pv.created_at)::date >= p.paris_today - (p.days - 1)
), today_rows as (
  select pv.* from public.page_views pv, params p
  where timezone('Europe/Paris', pv.created_at)::date = p.paris_today
), dates as (
  select generate_series(
    (select paris_today - (days - 1) from params),
    (select paris_today from params), interval '1 day'
  )::date as day
), daily as (
  select d.day, count(p.id)::bigint as visits, count(distinct p.visitor_id)::bigint as visitors
  from dates d left join period_rows p on timezone('Europe/Paris', p.created_at)::date = d.day
  group by d.day order by d.day
), top_pages as (
  select path, count(*)::bigint as visits, count(distinct visitor_id)::bigint as visitors
  from period_rows group by path order by visits desc, visitors desc, path limit 10
), devices as (
  select device, count(*)::bigint as visits from period_rows group by device order by visits desc
), sources as (
  select referrer, count(*)::bigint as visits from period_rows
  where referrer <> 'internal' group by referrer order by visits desc limit 10
)
select jsonb_build_object(
  'today_visits', (select count(*) from today_rows),
  'today_visitors', (select count(distinct visitor_id) from today_rows),
  'period_visits', (select count(*) from period_rows),
  'period_visitors', (select count(distinct visitor_id) from period_rows),
  'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'visits', visits, 'visitors', visitors) order by day) from daily), '[]'::jsonb),
  'top_pages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'visits', visits, 'visitors', visitors)) from top_pages), '[]'::jsonb),
  'devices', coalesce((select jsonb_agg(jsonb_build_object('device', device, 'visits', visits)) from devices), '[]'::jsonb),
  'sources', coalesce((select jsonb_agg(jsonb_build_object('referrer', referrer, 'visits', visits)) from sources), '[]'::jsonb)
);
$$;

revoke execute on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;
