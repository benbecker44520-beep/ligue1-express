-- LIGUE 1 EXPRESS - V2
-- À exécuter une seule fois dans le SQL Editor de Supabase.

create extension if not exists pgcrypto;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('ACTUALITÉS', 'MERCATO', 'ANALYSES')),
  excerpt text not null default '',
  content text not null default '',
  image_url text,
  tiktok_url text,
  related_club_ids bigint[] not null default '{}'::bigint[],
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.articles enable row level security;

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
on public.articles for select
to anon
using (status = 'published');

drop policy if exists "Authenticated can read all articles" on public.articles;
create policy "Authenticated can read all articles"
on public.articles for select
to authenticated
using (true);

drop policy if exists "Authenticated can insert articles" on public.articles;
create policy "Authenticated can insert articles"
on public.articles for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update articles" on public.articles;
create policy "Authenticated can update articles"
on public.articles for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete articles" on public.articles;
create policy "Authenticated can delete articles"
on public.articles for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read article images" on storage.objects;
create policy "Public can read article images"
on storage.objects for select
to public
using (bucket_id = 'article-images');

drop policy if exists "Authenticated can upload article images" on storage.objects;
create policy "Authenticated can upload article images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'article-images');

drop policy if exists "Authenticated can update article images" on storage.objects;
create policy "Authenticated can update article images"
on storage.objects for update
to authenticated
using (bucket_id = 'article-images')
with check (bucket_id = 'article-images');

drop policy if exists "Authenticated can delete article images" on storage.objects;
create policy "Authenticated can delete article images"
on storage.objects for delete
to authenticated
using (bucket_id = 'article-images');
