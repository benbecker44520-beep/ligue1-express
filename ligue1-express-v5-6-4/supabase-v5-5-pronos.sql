-- Ligue 1 Express V5.5 — Pronostics 1/N/2
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id text not null unique,
  competition text not null default 'Ligue 1',
  home_team text not null,
  away_team text not null,
  match_date timestamptz,
  selection text not null check (selection in ('1','N','2')),
  comment text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.predictions enable row level security;

drop policy if exists "Public can read published predictions" on public.predictions;
create policy "Public can read published predictions"
on public.predictions for select
to anon
using (status = 'published');

drop policy if exists "Authenticated can read predictions" on public.predictions;
create policy "Authenticated can read predictions"
on public.predictions for select
to authenticated
using (true);

drop policy if exists "Authenticated can insert predictions" on public.predictions;
create policy "Authenticated can insert predictions"
on public.predictions for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update predictions" on public.predictions;
create policy "Authenticated can update predictions"
on public.predictions for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete predictions" on public.predictions;
create policy "Authenticated can delete predictions"
on public.predictions for delete
to authenticated
using (true);
