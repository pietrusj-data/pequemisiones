-- 0008 · Botón de reportar un mensaje (D-07, capa B)
--
-- La comprobación automática no es infalible, y no puede serlo. Hace falta que
-- cualquier adulto de la familia pueda decir "esto no debería haberle llegado a
-- mi hijo" y que el mensaje deje de estar disponible AL INSTANTE, sin esperar a
-- que nadie revise nada.
--
-- Diseño deliberadamente simple: una columna `reportada` que el propio cliente
-- puede marcar (ya tiene permiso de UPDATE dentro de su familia) y que el
-- dispositivo del niño respeta al pedir sus misiones. El veredicto de la IA
-- (`revision`) sigue siendo intocable para el cliente: son dos cosas distintas.
--
-- El peor abuso posible es que un adulto de la familia esconda una misión de su
-- propia familia. Asumible: ya podía borrarla.

alter table public.pm_misiones add column if not exists reportada boolean not null default false;

-- El registro de lo reportado, para poder mirarlo y aprender de ello.
create table if not exists public.pm_reportes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  mision_id  uuid,
  motivo     text,
  texto      text   -- copia del mensaje reportado: si se borra la misión, queda el caso
);
create index if not exists pm_reportes_familia_fecha on public.pm_reportes (familia, created_at desc);

alter table public.pm_reportes enable row level security;

drop policy if exists pm_rep_ins on public.pm_reportes;
drop policy if exists pm_rep_sel on public.pm_reportes;
create policy pm_rep_ins on public.pm_reportes for insert to anon
  with check (familia = familia_peticion());
create policy pm_rep_sel on public.pm_reportes for select to anon
  using (familia = familia_peticion());

-- Sin UPDATE ni DELETE: un reporte no se puede borrar ni maquillar.
