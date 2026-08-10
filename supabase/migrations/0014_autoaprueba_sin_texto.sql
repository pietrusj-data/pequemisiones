-- 0014 · Las misiones SIN texto libre se aprueban en la propia base de datos
--
-- La regla ya existía, pero vivía en la función `moderar`: una misión sin
-- mensaje y con título autogenerado no tiene nada que moderar. Al bajarla a un
-- trigger, esas misiones fluyen al instante aunque la función esté caída o a
-- medio desplegar, y la IA solo se paga cuando hay texto de verdad.
--
-- El orden importa: los triggers BEFORE de una misma tabla se disparan por
-- orden alfabético, así que este se llama trg_zz_… para correr DESPUÉS del
-- guardián pm_protege_revision (que fuerza 'pendiente' a los clientes).

create or replace function public.pm_autoaprueba_sin_texto()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.revision = 'pendiente'
     and (new.mensaje is null or btrim(new.mensaje) = '')
     and (new.titulo is null or btrim(new.titulo) = ''
          or new.titulo ~ '^(Misión|Misión de papá|Misión del [0-9]{1,2}/[0-9]{1,2})$')
  then
    new.revision := 'aprobada';
    new.revision_motivo := 'sin_texto';
  end if;
  return new;
end $$;

drop trigger if exists trg_zz_autoaprueba on public.pm_misiones;
create trigger trg_zz_autoaprueba
  before insert on public.pm_misiones
  for each row execute function public.pm_autoaprueba_sin_texto();

drop trigger if exists trg_zz_autoaprueba on public.mates_misiones;
create trigger trg_zz_autoaprueba
  before insert on public.mates_misiones
  for each row execute function public.pm_autoaprueba_sin_texto();

drop trigger if exists trg_zz_autoaprueba on public.jim_misiones;
create trigger trg_zz_autoaprueba
  before insert on public.jim_misiones
  for each row execute function public.pm_autoaprueba_sin_texto();
