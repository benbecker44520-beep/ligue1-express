-- Foot Français Express V8.30
-- Notification push immédiate dès qu'un article devient publié.

create extension if not exists pg_net with schema extensions;

create or replace function public.ffe_notify_article_published()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if old.status = 'published' then
      return new;
    end if;
  end if;

  perform net.http_post(
    url := 'https://foot-francais-express.vercel.app/api/article-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('article_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists ffe_article_published_push on public.articles;

create trigger ffe_article_published_push
after insert or update of status on public.articles
for each row
execute function public.ffe_notify_article_published();
