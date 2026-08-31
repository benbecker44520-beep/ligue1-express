-- Ligue 1 Express V5.6
-- Clubs liés aux articles (liens vers fiches clubs)

alter table public.articles
  add column if not exists related_club_ids bigint[] not null default '{}'::bigint[];

comment on column public.articles.related_club_ids is
  'IDs football-data.org des clubs Ligue 1 concernés par l article.';
