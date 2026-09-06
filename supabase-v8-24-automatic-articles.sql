-- Foot Français Express V8.24 — articles automatiques avec validation rédactionnelle

alter table public.articles add column if not exists auto_generated boolean not null default false;
alter table public.articles add column if not exists source_type text;
alter table public.articles add column if not exists source_match_id text;
alter table public.articles add column if not exists review_status text not null default 'manual';
alter table public.articles add column if not exists generated_at timestamptz;
alter table public.articles add column if not exists review_notified_at timestamptz;
alter table public.articles add column if not exists reviewed_at timestamptz;
alter table public.articles add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.articles add column if not exists automation_payload jsonb not null default '{}'::jsonb;
alter table public.articles add column if not exists social_publications jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.articles add constraint articles_review_status_check
  check (review_status in ('manual', 'pending_review', 'approved', 'rejected'));
exception when duplicate_object then null;
end $$;

create unique index if not exists articles_unique_automatic_match
on public.articles (source_type, source_match_id)
where auto_generated = true and source_match_id is not null;

create table if not exists public.article_automation_runs (
  run_key text primary key,
  last_run_at timestamptz not null default now()
);

alter table public.article_automation_runs enable row level security;
revoke all on table public.article_automation_runs from anon, authenticated;

comment on column public.articles.review_status is 'Un article automatique reste pending_review jusqu’à validation explicite dans l’administration.';
