-- Ligue 1 Express V8.15 — récupération sécurisée du profil supporter

create extension if not exists pgcrypto;

alter table public.supporter_profiles
add column if not exists recovery_code_hash text;

create unique index if not exists supporter_profiles_recovery_code_hash_idx
on public.supporter_profiles (recovery_code_hash)
where recovery_code_hash is not null;

create or replace function public.generate_supporter_recovery_code(p_voter_token uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_raw_code text;
  v_display_code text;
begin
  if not exists (select 1 from public.supporter_profiles where voter_token = p_voter_token) then
    raise exception 'profile not found';
  end if;

  v_raw_code := upper(encode(gen_random_bytes(8), 'hex'));
  v_display_code := substring(v_raw_code, 1, 4) || '-' || substring(v_raw_code, 5, 4) || '-' || substring(v_raw_code, 9, 4) || '-' || substring(v_raw_code, 13, 4);

  update public.supporter_profiles
  set recovery_code_hash = encode(digest(v_raw_code, 'sha256'), 'hex'), updated_at = now()
  where voter_token = p_voter_token;

  return v_display_code;
end;
$$;

create or replace function public.restore_supporter_profile(p_recovery_code text)
returns table(profile_id uuid, nickname text, voter_token uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_normalized text := upper(regexp_replace(coalesce(p_recovery_code, ''), '[^0-9A-F]', '', 'g'));
begin
  if char_length(v_normalized) <> 16 then
    raise exception 'invalid recovery code';
  end if;

  return query
  select profile.id, profile.nickname, profile.voter_token
  from public.supporter_profiles profile
  where profile.recovery_code_hash = encode(digest(v_normalized, 'sha256'), 'hex')
  limit 1;

  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

revoke all on function public.generate_supporter_recovery_code(uuid) from public;
revoke all on function public.restore_supporter_profile(text) from public;
grant execute on function public.generate_supporter_recovery_code(uuid) to anon, authenticated;
grant execute on function public.restore_supporter_profile(text) to anon, authenticated;
