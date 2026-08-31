-- Ligue 1 Express V6.0 — Pronostics enrichis + Centre Mercato
alter table public.predictions add column if not exists confidence integer;
alter table public.predictions add column if not exists secondary_bet text;

alter table public.predictions drop constraint if exists predictions_confidence_check;
alter table public.predictions add constraint predictions_confidence_check check (confidence is null or (confidence >= 1 and confidence <= 10));

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  from_club text,
  to_club text,
  transfer_type text not null default 'transfer' check (transfer_type in ('transfer','loan','free','return')),
  transfer_status text not null default 'rumour' check (transfer_status in ('official','advanced','rumour')),
  fee text,
  position text,
  note text,
  occurred_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transfers enable row level security;
drop policy if exists "Public can read transfers" on public.transfers;
create policy "Public can read transfers" on public.transfers for select to anon, authenticated using (true);
drop policy if exists "Authenticated can insert transfers" on public.transfers;
create policy "Authenticated can insert transfers" on public.transfers for insert to authenticated with check (true);
drop policy if exists "Authenticated can update transfers" on public.transfers;
create policy "Authenticated can update transfers" on public.transfers for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated can delete transfers" on public.transfers;
create policy "Authenticated can delete transfers" on public.transfers for delete to authenticated using (true);
