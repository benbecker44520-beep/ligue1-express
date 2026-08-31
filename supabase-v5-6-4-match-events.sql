-- Ligue 1 Express V5.6.4
-- Faits marquants manuels pour les fiches match

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  team_side text not null check (team_side in ('home', 'away')),
  event_type text not null check (event_type in ('goal', 'disallowed_goal', 'yellow_card', 'red_card', 'substitution')),
  minute integer not null check (minute >= 0 and minute <= 130),
  player_name text,
  player_in text,
  player_out text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists match_events_match_id_idx on public.match_events(match_id);

alter table public.match_events enable row level security;

drop policy if exists "match_events_public_read" on public.match_events;
create policy "match_events_public_read"
on public.match_events for select
to anon, authenticated
using (true);

drop policy if exists "match_events_authenticated_insert" on public.match_events;
create policy "match_events_authenticated_insert"
on public.match_events for insert
to authenticated
with check (true);

drop policy if exists "match_events_authenticated_update" on public.match_events;
create policy "match_events_authenticated_update"
on public.match_events for update
to authenticated
using (true)
with check (true);

drop policy if exists "match_events_authenticated_delete" on public.match_events;
create policy "match_events_authenticated_delete"
on public.match_events for delete
to authenticated
using (true);
