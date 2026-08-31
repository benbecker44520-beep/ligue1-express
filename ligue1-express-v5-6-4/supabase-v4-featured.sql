-- LIGUE 1 EXPRESS V4
-- Ajoute la gestion éditoriale "À LA UNE".
-- À lancer UNE FOIS dans Supabase > SQL Editor.

alter table public.articles
add column if not exists is_featured boolean not null default false;

-- Une seule ligne peut être "À LA UNE" à la fois.
create unique index if not exists articles_single_featured_idx
on public.articles (is_featured)
where is_featured = true;

NOTIFY pgrst, 'reload schema';
