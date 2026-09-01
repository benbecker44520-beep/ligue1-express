create table if not exists public.express_feed (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'info' check (category in ('mercato','officiel','match','blessure','declaration','coupe','club','info')),
  title text not null,
  body text,
  club_name text,
  player_name text,
  link_url text,
  status text not null default 'published' check (status in ('published','draft')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.express_feed enable row level security;
drop policy if exists "express_feed_public_read" on public.express_feed;
create policy "express_feed_public_read" on public.express_feed for select using (status = 'published');
drop policy if exists "express_feed_authenticated_insert" on public.express_feed;
create policy "express_feed_authenticated_insert" on public.express_feed for insert to authenticated with check (true);
drop policy if exists "express_feed_authenticated_update" on public.express_feed;
create policy "express_feed_authenticated_update" on public.express_feed for update to authenticated using (true) with check (true);
drop policy if exists "express_feed_authenticated_delete" on public.express_feed;
create policy "express_feed_authenticated_delete" on public.express_feed for delete to authenticated using (true);
create index if not exists express_feed_published_at_idx on public.express_feed (published_at desc);
