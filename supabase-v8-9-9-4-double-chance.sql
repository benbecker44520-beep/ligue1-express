-- Autorise les pronostics simples et les doubles chances.
alter table public.predictions
drop constraint if exists predictions_selection_check;

alter table public.predictions
add constraint predictions_selection_check
check (selection in ('1', 'N', '2', '1N', 'N2', '12'));
