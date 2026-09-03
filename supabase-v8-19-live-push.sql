-- Ligue 1 Express V8.19 — abonnements Web Push et anti-doublon LIVE

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "Members read own push subscriptions" on public.push_subscriptions;
drop policy if exists "Members insert own push subscriptions" on public.push_subscriptions;
drop policy if exists "Members update own push subscriptions" on public.push_subscriptions;
drop policy if exists "Members delete own push subscriptions" on public.push_subscriptions;
create policy "Members read own push subscriptions" on public.push_subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "Members insert own push subscriptions" on public.push_subscriptions for insert to authenticated with check (auth.uid() = user_id);
create policy "Members update own push subscriptions" on public.push_subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Members delete own push subscriptions" on public.push_subscriptions for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.live_notification_events (
  event_key text primary key,
  match_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_notification_events_created_at_idx
on public.live_notification_events(created_at desc);

alter table public.live_notification_events enable row level security;
revoke all on public.live_notification_events from public, anon, authenticated;

-- Nettoyage automatique possible depuis le contrôleur : les clés ne servent
-- qu'à empêcher l'envoi répété d'un même événement.

