-- Ligue 1 Express V8.11 — statistiques globales Rédaction vs Supporters

create or replace function public.get_all_supporter_prediction_stats()
returns table(match_id text, selection text, vote_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select sp.match_id, sp.selection, count(*)::bigint as vote_count
  from public.supporter_predictions sp
  group by sp.match_id, sp.selection
  order by sp.match_id, case sp.selection when '1' then 1 when 'N' then 2 else 3 end;
$$;

revoke all on function public.get_all_supporter_prediction_stats() from public;
grant execute on function public.get_all_supporter_prediction_stats() to anon, authenticated;
