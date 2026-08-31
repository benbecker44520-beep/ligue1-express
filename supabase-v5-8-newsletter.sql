-- Ligue 1 Express V5.8 - Newsletter complète + désinscription
create extension if not exists pgcrypto;

alter table public.newsletter_subscribers
  add column if not exists unsubscribe_token uuid default gen_random_uuid();

update public.newsletter_subscribers
set unsubscribe_token = gen_random_uuid()
where unsubscribe_token is null;

alter table public.newsletter_subscribers
  alter column unsubscribe_token set not null;

create unique index if not exists newsletter_subscribers_unsubscribe_token_idx
  on public.newsletter_subscribers(unsubscribe_token);

create table if not exists public.newsletter_editions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  intro text not null default '',
  article_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'draft' check (status in ('draft','sent','partial','failed')),
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  sent_by text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.newsletter_editions enable row level security;

drop policy if exists "newsletter_editions_authenticated_all" on public.newsletter_editions;
create policy "newsletter_editions_authenticated_all" on public.newsletter_editions
for all to authenticated using (true) with check (true);

create or replace function public.unsubscribe_newsletter(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.newsletter_subscribers
  set active = false
  where unsubscribe_token = p_token and active = true;
  return found;
end;
$$;

revoke all on function public.unsubscribe_newsletter(uuid) from public;
grant execute on function public.unsubscribe_newsletter(uuid) to anon, authenticated;
