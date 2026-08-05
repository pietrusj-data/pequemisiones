-- 0010 · Registro de errores del cliente
--
-- Hasta ahora, si a un peque se le quedaba la app en blanco, nadie se enteraba
-- salvo que el adulto lo contase. Esto es lo mínimo para enterarse.
--
-- QUÉ NO SE GUARDA, A PROPÓSITO: ni código de familia, ni perfil, ni nada que
-- permita saber a quién le pasó. Un error no justifica saltarse el principio de
-- la casa. Se guarda lo justo para poder reproducirlo: el mensaje, dónde ocurrió,
-- qué motor y qué navegador.
--
-- La tabla es INSERT-only para la clave pública, igual que la lista de espera:
-- cualquiera puede reportar un error, nadie puede leer los errores de nadie.

create table if not exists public.pm_errores (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  motor      text,                       -- primaria | infantil | portal
  pantalla   text,                       -- en qué pantalla estaba
  mensaje    text not null,
  origen     text,                       -- archivo:línea:columna
  agente     text,                       -- navegador y sistema, resumidos
  version    text                        -- fecha de despliegue del cliente
);
create index if not exists pm_errores_fecha on public.pm_errores (created_at desc);

alter table public.pm_errores enable row level security;

drop policy if exists pm_err_ins on public.pm_errores;
create policy pm_err_ins on public.pm_errores for insert to anon with check (true);
-- Sin SELECT: los errores se miran desde el panel de Supabase.

-- Los errores caducan a los 90 días: para depurar no hacen falta más.
create or replace function public.pm_borra_errores_viejos()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  delete from public.pm_errores where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.pm_borra_errores_viejos() from public, anon, authenticated;

select cron.unschedule('pm_borra_errores_viejos')
  where exists (select 1 from cron.job where jobname = 'pm_borra_errores_viejos');

select cron.schedule('pm_borra_errores_viejos', '41 3 * * *',
  $limpia$ select public.pm_borra_errores_viejos() $limpia$);
