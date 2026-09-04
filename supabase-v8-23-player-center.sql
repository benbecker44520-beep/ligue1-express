-- Ligue 1 Express V8.23 — suivi et historique des joueurs

create table if not exists public.followed_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id text not null,
  player_name text not null,
  team_id text,
  team_name text,
  player_url text not null,
  created_at timestamptz not null default now(),
  unique(user_id, player_id)
);
create index if not exists followed_players_user_idx on public.followed_players(user_id);
alter table public.followed_players enable row level security;
create policy "Members read own followed players" on public.followed_players for select to authenticated using (auth.uid()=user_id);
create policy "Members insert own followed players" on public.followed_players for insert to authenticated with check (auth.uid()=user_id);
create policy "Members delete own followed players" on public.followed_players for delete to authenticated using (auth.uid()=user_id);
grant select,insert,delete on public.followed_players to authenticated;

create table if not exists public.player_live_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  player_name text not null,
  event_type text not null check(event_type in ('goal','yellow_card','red_card')),
  minute_label text,
  match_id text not null,
  match_url text not null,
  home_name text not null,
  away_name text not null,
  event_at timestamptz not null default now()
);
create index if not exists player_live_events_player_idx on public.player_live_events(player_name,event_at desc);
alter table public.player_live_events enable row level security;
create policy "Public reads player live history" on public.player_live_events for select to anon,authenticated using (true);
grant select on public.player_live_events to anon,authenticated;
