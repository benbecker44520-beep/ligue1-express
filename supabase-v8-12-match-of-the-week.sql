-- Ligue 1 Express V8.12 — Match de la semaine

alter table public.predictions add column if not exists is_week_match boolean not null default false;
alter table public.predictions add column if not exists players_to_watch text;
alter table public.predictions add column if not exists absentees text;

create unique index if not exists predictions_one_week_match_idx
on public.predictions (is_week_match)
where is_week_match = true;
