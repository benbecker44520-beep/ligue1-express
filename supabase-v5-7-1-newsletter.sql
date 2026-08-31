-- Ligue 1 Express V5.7.1 - Newsletter
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default true,
  active boolean not null default true,
  subscribed_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;
create policy "newsletter_public_insert" on public.newsletter_subscribers
for insert to anon, authenticated
with check (consent = true and active = true);

drop policy if exists "newsletter_authenticated_select" on public.newsletter_subscribers;
create policy "newsletter_authenticated_select" on public.newsletter_subscribers
for select to authenticated using (true);

drop policy if exists "newsletter_authenticated_delete" on public.newsletter_subscribers;
create policy "newsletter_authenticated_delete" on public.newsletter_subscribers
for delete to authenticated using (true);
