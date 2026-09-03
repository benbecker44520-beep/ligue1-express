-- Ligue 1 Express V8.20 — matchs suivis par les membres

create table if not exists public.followed_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'apifootball',
  match_id text not null,
  league_name text,
  home_name text not null,
  away_name text not null,
  match_url text not null,
  starts_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, provider, match_id)
);

create index if not exists followed_matches_user_id_idx on public.followed_matches(user_id);
create index if not exists followed_matches_match_idx on public.followed_matches(provider, match_id);

alter table public.followed_matches enable row level security;
drop policy if exists "Members read own followed matches" on public.followed_matches;
drop policy if exists "Members insert own followed matches" on public.followed_matches;
drop policy if exists "Members update own followed matches" on public.followed_matches;
drop policy if exists "Members delete own followed matches" on public.followed_matches;
create policy "Members read own followed matches" on public.followed_matches for select to authenticated using (auth.uid() = user_id);
create policy "Members insert own followed matches" on public.followed_matches for insert to authenticated with check (auth.uid() = user_id);
create policy "Members update own followed matches" on public.followed_matches for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Members delete own followed matches" on public.followed_matches for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.followed_matches to authenticated;

