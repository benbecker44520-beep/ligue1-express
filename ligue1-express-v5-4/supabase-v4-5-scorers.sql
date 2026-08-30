-- LIGUE 1 EXPRESS - V4.5
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Ajoute les buteurs manuels aux fiches match.

create extension if not exists pgcrypto;

create table if not exists public.match_scorers (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  team_side text not null check (team_side in ('home', 'away')),
  player_name text not null,
  minute integer not null check (minute >= 0 and minute <= 130),
  goal_type text not null default 'normal' check (goal_type in ('normal', 'penalty', 'own_goal')),
  created_at timestamptz not null default now()
);

create index if not exists match_scorers_match_id_idx
on public.match_scorers (match_id, minute);

alter table public.match_scorers enable row level security;

drop policy if exists "Public can read match scorers" on public.match_scorers;
create policy "Public can read match scorers"
on public.match_scorers for select
to anon
using (true);

drop policy if exists "Authenticated can read match scorers" on public.match_scorers;
create policy "Authenticated can read match scorers"
on public.match_scorers for select
to authenticated
using (true);

drop policy if exists "Authenticated can insert match scorers" on public.match_scorers;
create policy "Authenticated can insert match scorers"
on public.match_scorers for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update match scorers" on public.match_scorers;
create policy "Authenticated can update match scorers"
on public.match_scorers for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete match scorers" on public.match_scorers;
create policy "Authenticated can delete match scorers"
on public.match_scorers for delete
to authenticated
using (true);
