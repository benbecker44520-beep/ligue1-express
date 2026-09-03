-- Ligue 1 Express V8.16 — comptes membres Supabase Auth

alter table public.supporter_profiles
  add column if not exists user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists favorite_club jsonb,
  add column if not exists alert_preferences jsonb not null default '{}'::jsonb;

create index if not exists supporter_profiles_user_id_idx
on public.supporter_profiles (user_id) where user_id is not null;

create or replace function public.handle_new_member()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_nickname text := trim(coalesce(new.raw_user_meta_data->>'nickname', ''));
  v_token_text text := coalesce(new.raw_user_meta_data->>'voter_token', '');
  v_voter_token uuid;
  v_favorite jsonb := new.raw_user_meta_data->'favorite_club';
  v_alerts jsonb := coalesce(new.raw_user_meta_data->'alert_preferences', '{}'::jsonb);
begin
  if char_length(v_nickname) < 3 or char_length(v_nickname) > 20 or v_nickname ~ '[^[:alnum:]_-]' then raise exception 'invalid nickname'; end if;
  if v_token_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then v_voter_token := v_token_text::uuid; else v_voter_token := gen_random_uuid(); end if;

  update public.supporter_profiles
  set user_id = new.id, favorite_club = v_favorite, alert_preferences = v_alerts, updated_at = now()
  where voter_token = v_voter_token and user_id is null;
  if not found then
    insert into public.supporter_profiles (user_id, voter_token, nickname, favorite_club, alert_preferences)
    values (new.id, v_voter_token, v_nickname, v_favorite, v_alerts);
  end if;
  return new;
exception when unique_violation then raise exception 'nickname already used';
end;
$$;

drop trigger if exists on_auth_user_created_ligue1_express on auth.users;
create trigger on_auth_user_created_ligue1_express
after insert on auth.users for each row execute procedure public.handle_new_member();

drop policy if exists "member can read own supporter profile" on public.supporter_profiles;
create policy "member can read own supporter profile"
on public.supporter_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "member can update own supporter profile" on public.supporter_profiles;
create policy "member can update own supporter profile"
on public.supporter_profiles for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.get_my_supporter_profile()
returns table(profile_id uuid, nickname text, voter_token uuid, favorite_club jsonb, alert_preferences jsonb)
language sql security definer set search_path = public stable
as $$
  select profile.id, profile.nickname, profile.voter_token, profile.favorite_club, profile.alert_preferences
  from public.supporter_profiles profile where profile.user_id = auth.uid() limit 1;
$$;

create or replace function public.update_my_supporter_profile(p_nickname text default null, p_favorite_club jsonb default null, p_alert_preferences jsonb default null)
returns void language plpgsql security definer set search_path = public
as $$
declare v_nickname text := nullif(trim(p_nickname), '');
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if v_nickname is not null and (char_length(v_nickname) < 3 or char_length(v_nickname) > 20 or v_nickname ~ '[^[:alnum:]_-]') then raise exception 'invalid nickname'; end if;
  update public.supporter_profiles
  set nickname = coalesce(v_nickname, nickname), favorite_club = coalesce(p_favorite_club, favorite_club),
      alert_preferences = coalesce(p_alert_preferences, alert_preferences), updated_at = now()
  where user_id = auth.uid();
exception when unique_violation then raise exception 'nickname already used';
end;
$$;

revoke all on function public.get_my_supporter_profile() from public;
revoke all on function public.update_my_supporter_profile(text, jsonb, jsonb) from public;
grant execute on function public.get_my_supporter_profile() to authenticated;
grant execute on function public.update_my_supporter_profile(text, jsonb, jsonb) to authenticated;
