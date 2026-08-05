-- 0004 · El portal multi-familia: las tablas del producto
--
-- Estas son las tablas que usa PequeMisiones de verdad (app/primaria.html y
-- app/infantil.html). Cada fila lleva `familia` (código opaco tipo LUNA-847) y
-- `perfil` (nombre normalizado del peque, estable entre dispositivos).
--
-- CÓMO FUNCIONA LA SEGURIDAD (4-ago-2026)
-- El cliente manda en cada petición la cabecera `x-familia` con su código.
-- Postgres la lee con familia_peticion() y todas las políticas comparan contra
-- ella. Sin código no se ve ni se toca nada; con el código de otra familia, el
-- servidor responde 401. El código es la llave: quien lo tiene, entra — por eso
-- se genera opaco y se puede cambiar desde el portal.
--
-- LÍMITE CONOCIDO: la llave es permanente y compartida. El siguiente paso
-- (Supabase Auth para el adulto + emparejamiento temporal por QR) está en el
-- roadmap P0, antes de cobrar. Ver peques-app/SEGURIDAD.md.

-- Lee el código de familia que viene en la cabecera de la petición.
-- Devuelve null si no viene o viene vacía → ninguna política casa → no ve nada.
create or replace function public.familia_peticion()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::json->>'x-familia', '');
$$;

create table if not exists public.pm_misiones (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  perfil     text not null,
  titulo     text not null default 'Misión',
  mensaje    text,
  nivel      integer not null,
  ejercicios jsonb   not null,
  estado     text    not null default 'pendiente',
  hecha_at   timestamptz
  -- las columnas de moderación (revision, revision_motivo) las añade el 0005
);
create index if not exists pm_misiones_fam_idx on public.pm_misiones (familia, perfil, estado);

create table if not exists public.pm_resultados (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  perfil     text not null,
  mision_id  uuid,
  modo       text not null,
  nivel      integer,
  aciertos   integer not null default 0,
  fallos     integer not null default 0,
  gemas      integer not null default 0,
  tiempo_seg integer not null default 0,
  detalle    jsonb
);
create index if not exists pm_resultados_fam_idx on public.pm_resultados (familia, perfil, created_at desc);

create table if not exists public.pm_insignias (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  perfil     text not null,
  clave      text not null,
  nombre     text not null,
  unique (familia, perfil, clave)
);

alter table public.pm_misiones   enable row level security;
alter table public.pm_resultados enable row level security;
alter table public.pm_insignias  enable row level security;

-- Misiones: se ven, se crean y se actualizan solo dentro de la propia familia.
-- El borrado está limitado a las misiones YA HECHAS (limpieza del historial):
-- así nadie puede borrarle a un peque una misión que todavía no ha jugado.
drop policy if exists pm_mis_sel on public.pm_misiones;
drop policy if exists pm_mis_ins on public.pm_misiones;
drop policy if exists pm_mis_upd on public.pm_misiones;
drop policy if exists pm_mis_del on public.pm_misiones;
create policy pm_mis_sel on public.pm_misiones for select to anon
  using (familia = familia_peticion());
create policy pm_mis_ins on public.pm_misiones for insert to anon
  with check (familia = familia_peticion());
create policy pm_mis_upd on public.pm_misiones for update to anon
  using (familia = familia_peticion()) with check (familia = familia_peticion());
create policy pm_mis_del on public.pm_misiones for delete to anon
  using (familia = familia_peticion() and estado = 'hecha');

-- Resultados e insignias: crecer y leer dentro de la familia. Nunca borrar.
drop policy if exists pm_res_sel on public.pm_resultados;
drop policy if exists pm_res_ins on public.pm_resultados;
create policy pm_res_sel on public.pm_resultados for select to anon
  using (familia = familia_peticion());
create policy pm_res_ins on public.pm_resultados for insert to anon
  with check (familia = familia_peticion());

drop policy if exists pm_ins_sel on public.pm_insignias;
drop policy if exists pm_ins_ins on public.pm_insignias;
create policy pm_ins_sel on public.pm_insignias for select to anon
  using (familia = familia_peticion());
create policy pm_ins_ins on public.pm_insignias for insert to anon
  with check (familia = familia_peticion());
