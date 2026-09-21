-- Foot Français Express V8.32 — génération automatique des pronostics
alter table public.predictions
  add column if not exists is_automatic boolean not null default false,
  add column if not exists generated_at timestamptz;

comment on column public.predictions.is_automatic is
  'Vrai lorsque le pronostic a été généré par le moteur statistique automatique.';

comment on column public.predictions.generated_at is
  'Date de la dernière génération automatique du pronostic.';
