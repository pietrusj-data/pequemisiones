-- 0011 · Rotación del código de familia (la llave de los datos)
--
-- Los códigos de la primera época (LUNA-847) solo tenían 18.000 combinaciones:
-- con la clave pública se podían barrer todos y leer los datos de cualquier
-- familia. Los códigos nuevos que genera el portal llevan 8 caracteres de un
-- alfabeto de 29 (PALABRA-XXXX-XXXX, ~10^13 combinaciones): adivinar uno
-- barriendo ya no es viable.
--
-- Para las familias que aún tienen código débil, el portal ofrece "reforzar":
-- la edge function `rotar` mueve todo el historial al código nuevo con
-- service_role. Cada rotación queda apuntada aquí ANTES de mover nada:
--
--   · si la función se corta a mitad, el rastro dice qué pareja viejo→nuevo
--     estaba en marcha (reintentar con la misma pareja termina el trabajo);
--   · si un atacante rota el código de otra familia para dejarla fuera
--     (el único poder nuevo que da esta función a quien ya tiene el código),
--     desde el panel se ve la pareja y se deshace llamando a `rotar` al revés;
--   · la función usa esta tabla como límite de ritmo: 3 cambios/día por
--     familia y 40/día en total, que estrellan cualquier barrido masivo.
--
-- Los códigos se guardan en claro a propósito: son la llave, sí, pero esta
-- tabla solo la lee service_role (RLS activo y CERO políticas), y sin el texto
-- exacto no se puede deshacer un secuestro. Caducan a los 90 días con el mismo
-- barrido de pg_cron que limpia pm_errores.

create table if not exists public.pm_rotaciones (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  viejo      text not null,
  nuevo      text not null
);
create index if not exists pm_rotaciones_fecha on public.pm_rotaciones (created_at desc);
create index if not exists pm_rotaciones_viejo on public.pm_rotaciones (viejo, created_at desc);

alter table public.pm_rotaciones enable row level security;
-- Sin políticas: ni anon ni authenticated ven nada. Solo service_role (la función y el panel).

-- Limpieza a los 90 días, como los errores: para auditar y deshacer sobra.
create or replace function public.pm_borra_rotaciones_viejas()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  delete from public.pm_rotaciones where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Engancharla al barrido nocturno, mismo patrón que 0007 y 0010
select cron.unschedule('pm_borra_rotaciones_viejas')
  where exists (select 1 from cron.job where jobname = 'pm_borra_rotaciones_viejas');
select cron.schedule('pm_borra_rotaciones_viejas', '52 3 * * *',
  $$select public.pm_borra_rotaciones_viejas()$$);
