-- Ligue 1 Express V8.17 — séparation stricte membre / administrateur

alter table public.supporter_profiles
add column if not exists role text not null default 'member'
check (role in ('member', 'admin'));

create or replace function public.is_current_user_admin()
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.supporter_profiles where user_id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

create or replace function public.promote_member_to_admin(p_email text)
returns text language plpgsql security definer set search_path = public, auth
as $$
declare v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'user not found'; end if;
  update public.supporter_profiles set role = 'admin', updated_at = now() where user_id = v_user_id;
  if not found then
    insert into public.supporter_profiles (user_id, voter_token, nickname, role)
    values (v_user_id, gen_random_uuid(), 'admin_' || substring(md5(v_user_id::text), 1, 8), 'admin');
  end if;
  return 'admin enabled';
end;
$$;
revoke all on function public.promote_member_to_admin(text) from public, anon, authenticated;

-- Les anciennes politiques donnaient les droits de rédaction à tout compte connecté.
-- Elles sont remplacées par des politiques exigeant le rôle admin.

drop policy if exists "Authenticated can read all articles" on public.articles;
drop policy if exists "Authenticated can insert articles" on public.articles;
drop policy if exists "Authenticated can update articles" on public.articles;
drop policy if exists "Authenticated can delete articles" on public.articles;
create policy "Admins read all articles" on public.articles for select to authenticated using (public.is_current_user_admin());
create policy "Admins insert articles" on public.articles for insert to authenticated with check (public.is_current_user_admin());
create policy "Admins update articles" on public.articles for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "Admins delete articles" on public.articles for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "Authenticated can read predictions" on public.predictions;
drop policy if exists "Authenticated can insert predictions" on public.predictions;
drop policy if exists "Authenticated can update predictions" on public.predictions;
drop policy if exists "Authenticated can delete predictions" on public.predictions;
create policy "Admins read all predictions" on public.predictions for select to authenticated using (public.is_current_user_admin());
create policy "Admins insert predictions" on public.predictions for insert to authenticated with check (public.is_current_user_admin());
create policy "Admins update predictions" on public.predictions for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "Admins delete predictions" on public.predictions for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "Authenticated can insert transfers" on public.transfers;
drop policy if exists "Authenticated can update transfers" on public.transfers;
drop policy if exists "Authenticated can delete transfers" on public.transfers;
create policy "Admins insert transfers" on public.transfers for insert to authenticated with check (public.is_current_user_admin());
create policy "Admins update transfers" on public.transfers for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "Admins delete transfers" on public.transfers for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "Authenticated can insert match scorers" on public.match_scorers;
drop policy if exists "Authenticated can update match scorers" on public.match_scorers;
drop policy if exists "Authenticated can delete match scorers" on public.match_scorers;
create policy "Admins insert match scorers" on public.match_scorers for insert to authenticated with check (public.is_current_user_admin());
create policy "Admins update match scorers" on public.match_scorers for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "Admins delete match scorers" on public.match_scorers for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "match_events_authenticated_insert" on public.match_events;
drop policy if exists "match_events_authenticated_update" on public.match_events;
drop policy if exists "match_events_authenticated_delete" on public.match_events;
create policy "Admins insert match events" on public.match_events for insert to authenticated with check (public.is_current_user_admin());
create policy "Admins update match events" on public.match_events for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "Admins delete match events" on public.match_events for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "express_feed_authenticated_insert" on public.express_feed;
drop policy if exists "express_feed_authenticated_update" on public.express_feed;
drop policy if exists "express_feed_authenticated_delete" on public.express_feed;
create policy "Admins insert express feed" on public.express_feed for insert to authenticated with check (public.is_current_user_admin());
create policy "Admins update express feed" on public.express_feed for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "Admins delete express feed" on public.express_feed for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "newsletter_authenticated_select" on public.newsletter_subscribers;
drop policy if exists "newsletter_authenticated_delete" on public.newsletter_subscribers;
create policy "Admins read subscribers" on public.newsletter_subscribers for select to authenticated using (public.is_current_user_admin());
create policy "Admins delete subscribers" on public.newsletter_subscribers for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "newsletter_editions_authenticated_all" on public.newsletter_editions;
create policy "Admins manage newsletter editions" on public.newsletter_editions for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists "Authenticated can read analytics" on public.page_views;
create policy "Admins read analytics" on public.page_views for select to authenticated using (public.is_current_user_admin());

drop policy if exists "Authenticated can upload article images" on storage.objects;
drop policy if exists "Authenticated can update article images" on storage.objects;
drop policy if exists "Authenticated can delete article images" on storage.objects;
create policy "Admins upload article images" on storage.objects for insert to authenticated with check (bucket_id = 'article-images' and public.is_current_user_admin());
create policy "Admins update article images" on storage.objects for update to authenticated using (bucket_id = 'article-images' and public.is_current_user_admin()) with check (bucket_id = 'article-images' and public.is_current_user_admin());
create policy "Admins delete article images" on storage.objects for delete to authenticated using (bucket_id = 'article-images' and public.is_current_user_admin());
