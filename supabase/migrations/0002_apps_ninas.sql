-- 0002 · Las apps personales de las niñas (el laboratorio)
--
-- mates_* = El Reino de las Mates (Paula, primaria)
-- jim_*   = El Mundo de Jimena (infantil)
--
-- OJO con la seguridad de estas tablas: son de un solo hogar y la RLS es abierta
-- (cualquiera con la clave anon, que es pública, puede leerlas y escribirlas).
-- Se acepta a propósito porque NO contienen ningún dato personal: solo seudónimos
-- y progreso. El producto que se vende NO usa estas tablas — usa las pm_* del 0004,
-- que sí exigen la cabecera x-familia. Si algún día las niñas se migran al portal,
-- estas tablas se archivan y se borran.

create table if not exists public.mates_misiones (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  titulo     text not null default 'Misión de papá',
  mensaje    text,
  nivel      integer not null,
  ejercicios jsonb   not null,
  estado     text    not null default 'pendiente',
  hecha_at   timestamptz
);

create table if not exists public.mates_resultados (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mision_id  uuid,
  modo       text not null,
  nivel      integer,
  aciertos   integer not null default 0,
  fallos     integer not null default 0,
  gemas      integer not null default 0,
  tiempo_seg integer not null default 0,
  detalle    jsonb
);
create index if not exists mates_resultados_mision_idx on public.mates_resultados (mision_id);

create table if not exists public.mates_insignias (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  clave      text not null unique,
  nombre     text not null
);

create table if not exists public.jim_misiones (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  titulo     text not null default 'Misión de papá',
  mensaje    text,
  nivel      integer not null,
  ejercicios jsonb   not null,
  estado     text    not null default 'pendiente',
  hecha_at   timestamptz
);

create table if not exists public.jim_resultados (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mision_id  uuid,
  modo       text not null,
  nivel      integer,
  aciertos   integer not null default 0,
  fallos     integer not null default 0,
  gemas      integer not null default 0,
  tiempo_seg integer not null default 0,
  detalle    jsonb
);
create index if not exists jim_resultados_mision_idx on public.jim_resultados (mision_id);

create table if not exists public.jim_insignias (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  clave      text not null unique,
  nombre     text not null
);

alter table public.mates_misiones   enable row level security;
alter table public.mates_resultados enable row level security;
alter table public.mates_insignias  enable row level security;
alter table public.jim_misiones     enable row level security;
alter table public.jim_resultados   enable row level security;
alter table public.jim_insignias    enable row level security;

-- Misiones: papá inserta desde su móvil, la tablet las marca hechas y puede
-- borrar las viejas. Resultados e insignias: solo crecer, nunca borrar.
drop policy if exists mates_misiones_select on public.mates_misiones;
drop policy if exists mates_misiones_insert on public.mates_misiones;
drop policy if exists mates_misiones_update on public.mates_misiones;
drop policy if exists mates_misiones_delete on public.mates_misiones;
create policy mates_misiones_select on public.mates_misiones for select to anon using (true);
create policy mates_misiones_insert on public.mates_misiones for insert to anon with check (true);
create policy mates_misiones_update on public.mates_misiones for update to anon using (true) with check (true);
create policy mates_misiones_delete on public.mates_misiones for delete to anon using (true);

drop policy if exists mates_resultados_select on public.mates_resultados;
drop policy if exists mates_resultados_insert on public.mates_resultados;
create policy mates_resultados_select on public.mates_resultados for select to anon using (true);
create policy mates_resultados_insert on public.mates_resultados for insert to anon with check (true);

drop policy if exists mates_insignias_select on public.mates_insignias;
drop policy if exists mates_insignias_insert on public.mates_insignias;
create policy mates_insignias_select on public.mates_insignias for select to anon using (true);
create policy mates_insignias_insert on public.mates_insignias for insert to anon with check (true);

drop policy if exists jim_misiones_select on public.jim_misiones;
drop policy if exists jim_misiones_insert on public.jim_misiones;
drop policy if exists jim_misiones_update on public.jim_misiones;
drop policy if exists jim_misiones_delete on public.jim_misiones;
create policy jim_misiones_select on public.jim_misiones for select to anon using (true);
create policy jim_misiones_insert on public.jim_misiones for insert to anon with check (true);
create policy jim_misiones_update on public.jim_misiones for update to anon using (true) with check (true);
create policy jim_misiones_delete on public.jim_misiones for delete to anon using (true);

drop policy if exists jim_resultados_select on public.jim_resultados;
drop policy if exists jim_resultados_insert on public.jim_resultados;
create policy jim_resultados_select on public.jim_resultados for select to anon using (true);
create policy jim_resultados_insert on public.jim_resultados for insert to anon with check (true);

drop policy if exists jim_insignias_select on public.jim_insignias;
drop policy if exists jim_insignias_insert on public.jim_insignias;
create policy jim_insignias_select on public.jim_insignias for select to anon using (true);
create policy jim_insignias_insert on public.jim_insignias for insert to anon with check (true);
