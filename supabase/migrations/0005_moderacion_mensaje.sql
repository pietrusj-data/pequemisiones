-- 0005 · Moderación del mensaje del adulto (D-07, capa D · 4-ago-2026)
--
-- El mensaje que escribe el adulto se LEE EN VOZ ALTA a un niño de 3 a 8 años.
-- Cualquiera que tenga el código de familia puede escribirlo. Por eso ninguna
-- misión llega al peque sin pasar por una comprobación en el servidor.
--
-- EL CIRCUITO
--   1. La misión nace con revision = 'pendiente'  → el niño NO la ve.
--   2. Un trigger avisa a la edge function `moderar`.
--   3. `moderar` relee la fila con la clave de servicio (el aviso no es de fiar),
--      clasifica el texto con Haiku y la marca 'aprobada' o 'retenida'.
--   4. Si la IA falla, la fila se queda 'pendiente' y el barrido de pg_cron
--      reintenta cada 5 minutos. FAIL-CLOSED: nunca se aprueba sola.
--
-- Las misiones sin texto libre (título autogenerado, sin mensaje) se aprueban
-- al instante sin llamar a la IA.

alter table public.pm_misiones add column if not exists revision        text not null default 'pendiente';
alter table public.pm_misiones add column if not exists revision_motivo text;

-- El veredicto NO lo puede fijar el cliente: si la petición no viene con la clave
-- de servicio, se ignora lo que traiga y se fuerza 'pendiente' (en INSERT) o se
-- conserva el valor anterior (en UPDATE). Probado con INSERT y PATCH maliciosos.
create or replace function public.pm_protege_revision()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare rol text;
begin
  rol := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '');
  if rol not in ('service_role','') then
    if tg_op = 'INSERT' then
      new.revision := 'pendiente';
      new.revision_motivo := null;
    else
      new.revision := old.revision;
      new.revision_motivo := old.revision_motivo;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_pm_protege_revision on public.pm_misiones;
create trigger trg_pm_protege_revision
  before insert or update on public.pm_misiones
  for each row execute function public.pm_protege_revision();

-- Aviso a la función de moderación en cuanto nace la misión.
-- La cabecera lleva la clave anon, que es pública (va en cada index.html): sirve
-- para que la puerta de las funciones deje pasar la llamada, no da acceso a nada.
create or replace function public.pm_moderar_notifica()
returns trigger
language plpgsql
set search_path to 'public', 'extensions'
as $$
begin
  if new.revision = 'pendiente' then
    perform net.http_post(
      url := 'https://tyoavvibplxkevxkamsb.supabase.co/functions/v1/moderar',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2F2dmlicGx4a2V2eGthbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDA4NTAsImV4cCI6MjA5MjQxNjg1MH0.x26xzz4nV3Umtj4_4SCPu9NXQRLDEh1xZeQgGk6adrQ'
      ),
      body := jsonb_build_object('id', new.id),
      timeout_milliseconds := 8000
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_pm_moderar_notifica on public.pm_misiones;
create trigger trg_pm_moderar_notifica
  after insert on public.pm_misiones
  for each row execute function public.pm_moderar_notifica();

-- Barrido de seguridad: si el aviso se perdió o la IA estaba caída, reintenta
-- las misiones que llevan más de 2 minutos sin veredicto. Cada 5 minutos, 20 como mucho.
select cron.unschedule('pm_moderar_barrido')
  where exists (select 1 from cron.job where jobname = 'pm_moderar_barrido');

select cron.schedule('pm_moderar_barrido', '*/5 * * * *', $barrido$
  select net.http_post(
    url := 'https://tyoavvibplxkevxkamsb.supabase.co/functions/v1/moderar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2F2dmlicGx4a2V2eGthbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDA4NTAsImV4cCI6MjA5MjQxNjg1MH0.x26xzz4nV3Umtj4_4SCPu9NXQRLDEh1xZeQgGk6adrQ'
    ),
    body := jsonb_build_object('id', m.id),
    timeout_milliseconds := 8000
  )
  from public.pm_misiones m
  where m.revision = 'pendiente'
    and m.created_at < now() - interval '2 minutes'
  limit 20
$barrido$);
