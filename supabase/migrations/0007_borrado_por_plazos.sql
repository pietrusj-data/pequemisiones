-- 0007 · Borrado automático por plazos (RGPD, principio de limitación del plazo)
--
-- La política de privacidad promete dos plazos concretos. Prometerlos y no
-- cumplirlos sería peor que no decirlos, así que aquí se cumplen solos:
--
--   · pistas del ayudante (pm_dudas) ....... 12 meses
--   · familia sin actividad ................ 24 meses → se borra TODO su rastro
--
-- "Actividad" es la última misión enviada o el último ejercicio hecho. Una
-- familia que vuelve en el mes 23 reinicia el contador; una que no vuelve
-- desaparece sin que nadie tenga que acordarse.
--
-- La lista de espera (pm_interesados) también caduca a los 24 meses: el
-- consentimiento se pidió para avisar del lanzamiento, no para siempre.

create or replace function public.pm_borrado_por_plazos()
returns table(pistas_borradas int, familias_borradas int, interesados_borrados int)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n_pistas int := 0;
  n_familias int := 0;
  n_interesados int := 0;
  caducadas text[];
begin
  -- 1. Pistas de más de 12 meses
  delete from public.pm_dudas where created_at < now() - interval '12 months';
  get diagnostics n_pistas = row_count;

  -- 2. Familias sin actividad en 24 meses: se borra todo su rastro.
  --    Se calcula la última señal de vida sumando las dos tablas que la marcan.
  select coalesce(array_agg(familia), '{}')
    into caducadas
  from (
    select familia, max(cuando) as ultima
    from (
      select familia, greatest(created_at, coalesce(hecha_at, created_at)) as cuando from public.pm_misiones
      union all
      select familia, created_at from public.pm_resultados
    ) t
    group by familia
    having max(cuando) < now() - interval '24 months'
  ) f;

  if array_length(caducadas, 1) is not null then
    delete from public.pm_dudas      where familia = any(caducadas);
    delete from public.pm_insignias  where familia = any(caducadas);
    delete from public.pm_resultados where familia = any(caducadas);
    delete from public.pm_misiones   where familia = any(caducadas);
    n_familias := array_length(caducadas, 1);
  end if;

  -- 3. Insignias huérfanas: una familia que solo llegó a ganar una insignia y
  --    nunca más apareció no deja rastro eterno.
  delete from public.pm_insignias i
   where i.created_at < now() - interval '24 months'
     and not exists (select 1 from public.pm_misiones   m where m.familia = i.familia)
     and not exists (select 1 from public.pm_resultados r where r.familia = i.familia);

  -- 4. Lista de espera: el consentimiento no dura para siempre
  delete from public.pm_interesados where created_at < now() - interval '24 months';
  get diagnostics n_interesados = row_count;

  return query select n_pistas, n_familias, n_interesados;
end $$;

revoke all on function public.pm_borrado_por_plazos() from public, anon, authenticated;

-- Una vez al día, de madrugada (hora del servidor, UTC).
select cron.unschedule('pm_borrado_por_plazos')
  where exists (select 1 from cron.job where jobname = 'pm_borrado_por_plazos');

select cron.schedule('pm_borrado_por_plazos', '17 3 * * *',
  $borrado$ select public.pm_borrado_por_plazos() $borrado$);
