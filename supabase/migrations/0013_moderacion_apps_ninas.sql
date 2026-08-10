-- 0013 · La moderación llega a las apps de las niñas (mates_* y jim_*)
--
-- LO QUE PASÓ: el filtro del mensaje del adulto (0005) protegía solo
-- pm_misiones, las tablas del portal. Pero las niñas juegan en sus apps de la
-- primera época — mates_misiones y jim_misiones — que ni tienen columna de
-- revisión y cuya política de lectura era `using (true)`: cualquier mensaje,
-- el que fuera, se leía en voz alta al instante. Salió en el banco de pruebas
-- (un mensaje negativo llegó entero).
--
-- EL ARREGLO, EN LA BASE DE DATOS para no depender de las apps viejas:
--   1. Las dos tablas ganan revision/revision_motivo, con el mismo circuito
--      del portal: nacen 'pendiente', el trigger avisa a `moderar`, y el
--      barrido de pg_cron reintenta lo que se quede sin veredicto.
--   2. La política de LECTURA pasa a `revision = 'aprobada'`: una misión sin
--      aprobar ES INVISIBLE para la clave pública. Da igual lo que haga el
--      cliente: si no está aprobada, no existe. FAIL-CLOSED de verdad.
--   3. Las misiones que ya estaban se marcan aprobadas (ya fueron oídas;
--      esconderlas ahora solo confundiría).
--
-- Nota: el aviso al servidor lleva ahora {id, tabla}. La función `moderar`
-- desplegada tiene que ser la versión que entiende `tabla`; hasta que lo sea,
-- las misiones nuevas de las apps viejas se quedan 'pendiente' (invisibles),
-- que es exactamente lo que debe pasar cuando el filtro no puede comprobar.

-- 1 · columnas y estreno
alter table public.mates_misiones add column if not exists revision        text not null default 'pendiente';
alter table public.mates_misiones add column if not exists revision_motivo text;
alter table public.jim_misiones   add column if not exists revision        text not null default 'pendiente';
alter table public.jim_misiones   add column if not exists revision_motivo text;

update public.mates_misiones set revision = 'aprobada', revision_motivo = 'anterior_al_filtro' where revision = 'pendiente';
update public.jim_misiones   set revision = 'aprobada', revision_motivo = 'anterior_al_filtro' where revision = 'pendiente';

-- 2 · el veredicto no lo fija el cliente (mismo guardián que en el portal)
drop trigger if exists trg_mates_protege_revision on public.mates_misiones;
create trigger trg_mates_protege_revision
  before insert or update on public.mates_misiones
  for each row execute function public.pm_protege_revision();

drop trigger if exists trg_jim_protege_revision on public.jim_misiones;
create trigger trg_jim_protege_revision
  before insert or update on public.jim_misiones
  for each row execute function public.pm_protege_revision();

-- 3 · aviso a `moderar` diciendo DE QUÉ TABLA viene la misión
create or replace function public.pm_moderar_notifica_v2()
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
      body := jsonb_build_object('id', new.id, 'tabla', tg_table_name),
      timeout_milliseconds := 8000
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_pm_moderar_notifica on public.pm_misiones;
create trigger trg_pm_moderar_notifica
  after insert on public.pm_misiones
  for each row execute function public.pm_moderar_notifica_v2();

drop trigger if exists trg_mates_moderar_notifica on public.mates_misiones;
create trigger trg_mates_moderar_notifica
  after insert on public.mates_misiones
  for each row execute function public.pm_moderar_notifica_v2();

drop trigger if exists trg_jim_moderar_notifica on public.jim_misiones;
create trigger trg_jim_moderar_notifica
  after insert on public.jim_misiones
  for each row execute function public.pm_moderar_notifica_v2();

-- 4 · sin aprobar no se ve: la política de lectura deja de ser `true`
drop policy if exists mates_misiones_select on public.mates_misiones;
create policy mates_misiones_select on public.mates_misiones
  for select using (revision = 'aprobada');

drop policy if exists jim_misiones_select on public.jim_misiones;
create policy jim_misiones_select on public.jim_misiones
  for select using (revision = 'aprobada');

-- 5 · el barrido de seguridad vigila las tres tablas
select cron.unschedule('pm_moderar_barrido')
  where exists (select 1 from cron.job where jobname = 'pm_moderar_barrido');

select cron.schedule('pm_moderar_barrido', '*/5 * * * *', $barrido$
  select net.http_post(
    url := 'https://tyoavvibplxkevxkamsb.supabase.co/functions/v1/moderar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2F2dmlicGx4a2V2eGthbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDA4NTAsImV4cCI6MjA5MjQxNjg1MH0.x26xzz4nV3Umtj4_4SCPu9NXQRLDEh1xZeQgGk6adrQ'
    ),
    body := jsonb_build_object('id', x.id, 'tabla', x.tabla),
    timeout_milliseconds := 8000
  )
  from (
    select id, 'pm_misiones'    as tabla, created_at from public.pm_misiones    where revision = 'pendiente'
    union all
    select id, 'mates_misiones' as tabla, created_at from public.mates_misiones where revision = 'pendiente'
    union all
    select id, 'jim_misiones'   as tabla, created_at from public.jim_misiones   where revision = 'pendiente'
  ) x
  where x.created_at < now() - interval '2 minutes'
  limit 20
$barrido$);
