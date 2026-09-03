-- Ligue 1 Express V8.13 — profils et classement des pronostiqueurs

create table if not exists public.supporter_profiles (
  id uuid primary key default gen_random_uuid(),
  voter_token uuid not null unique,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supporter_profiles_nickname_length check (char_length(nickname) between 3 and 20)
);

create unique index if not exists supporter_profiles_nickname_unique_idx
on public.supporter_profiles (lower(nickname));

alter table public.supporter_profiles enable row level security;
revoke all on public.supporter_profiles from anon, authenticated;

create or replace function public.register_supporter_profile(
  p_voter_token uuid,
  p_nickname text
)
returns table(profile_id uuid, nickname text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nickname text := trim(p_nickname);
begin
  if char_length(v_nickname) < 3 or char_length(v_nickname) > 20 then
    raise exception 'nickname length';
  end if;
  if v_nickname ~ '[^[:alnum:]_-]' then
    raise exception 'nickname characters';
  end if;

  insert into public.supporter_profiles (voter_token, nickname)
  values (p_voter_token, v_nickname)
  on conflict (voter_token)
  do update set nickname = excluded.nickname, updated_at = now();

  return query
  select sp.id, sp.nickname
  from public.supporter_profiles sp
  where sp.voter_token = p_voter_token;
exception
  when unique_violation then
    raise exception 'nickname already used';
end;
$$;

create or replace function public.get_public_supporter_prediction_entries()
returns table(profile_id uuid, nickname text, match_id text, selection text, voted_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select profile.id, profile.nickname, vote.match_id, vote.selection, vote.updated_at
  from public.supporter_profiles profile
  join public.supporter_predictions vote on vote.voter_token = profile.voter_token
  order by vote.updated_at desc;
$$;

revoke all on function public.register_supporter_profile(uuid, text) from public;
revoke all on function public.get_public_supporter_prediction_entries() from public;
grant execute on function public.register_supporter_profile(uuid, text) to anon, authenticated;
grant execute on function public.get_public_supporter_prediction_entries() to anon, authenticated;
