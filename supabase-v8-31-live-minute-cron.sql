-- FF Express V8.31 — contrôle LIVE toutes les minutes via Supabase
-- IMPORTANT : remplacer REMPLACE_PAR_TON_CRON_SECRET par la valeur CRON_SECRET configurée dans Vercel.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Supprime l'ancien job s'il existe afin d'éviter les doublons.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'ffe-live-notifications-minute'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

-- Réveille le moteur LIVE toutes les minutes.
select cron.schedule(
  'ffe-live-notifications-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://foot-francais-express.vercel.app/api/live-notifications/check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer REMPLACE_PAR_TON_CRON_SECRET'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 50000
    );
  $job$
);

-- Vérification : la requête doit retourner une ligne avec le job actif.
select jobid, jobname, schedule, active
from cron.job
where jobname = 'ffe-live-notifications-minute';
