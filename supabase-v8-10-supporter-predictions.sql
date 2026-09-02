-- Ligue 1 Express V8.10 — Pronostics anonymes des supporters

create table if not exists public.supporter_predictions (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  voter_token uuid not null,
  selection text not null check (selection in ('1', 'N', '2')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, voter_token)
);

create index if not exists supporter_predictions_match_id_idx
on public.supporter_predictions (match_id);

alter table public.supporter_predictions enable row level security;

-- Aucun accès direct aux votes individuels depuis le navigateur.
revoke all on public.supporter_predictions from anon, authenticated;

create or replace function public.cast_supporter_prediction(
  p_match_id text,
  p_selection text,
  p_voter_token uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_date timestamptz;
begin
  if p_selection not in ('1', 'N', '2') then
    raise exception 'invalid selection';
  end if;

  select match_date into v_match_date
  from public.predictions
  where match_id = p_match_id and status = 'published'
  limit 1;

  if v_match_date is null or v_match_date <= now() then
    raise exception 'votes closed';
  end if;

  insert into public.supporter_predictions (match_id, voter_token, selection)
  values (p_match_id, p_voter_token, p_selection)
  on conflict (match_id, voter_token)
  do update set selection = excluded.selection, updated_at = now();
end;
$$;

create or replace function public.get_supporter_prediction_stats(p_match_id text)
returns table(selection text, vote_count bigint, total_votes bigint, percentage integer)
language sql
security definer
set search_path = public
stable
as $$
  with choices(selection) as (values ('1'::text), ('N'::text), ('2'::text)),
  counts as (
    select sp.selection, count(*)::bigint as vote_count
    from public.supporter_predictions sp
    where sp.match_id = p_match_id
    group by sp.selection
  ),
  total as (
    select count(*)::bigint as total_votes
    from public.supporter_predictions sp
    where sp.match_id = p_match_id
  )
  select
    c.selection,
    coalesce(ct.vote_count, 0)::bigint,
    t.total_votes,
    case when t.total_votes = 0 then 0
      else round(coalesce(ct.vote_count, 0) * 100.0 / t.total_votes)::integer
    end
  from choices c
  left join counts ct using (selection)
  cross join total t
  order by case c.selection when '1' then 1 when 'N' then 2 else 3 end;
$$;

revoke all on function public.cast_supporter_prediction(text, text, uuid) from public;
revoke all on function public.get_supporter_prediction_stats(text) from public;
grant execute on function public.cast_supporter_prediction(text, text, uuid) to anon, authenticated;
grant execute on function public.get_supporter_prediction_stats(text) to anon, authenticated;
