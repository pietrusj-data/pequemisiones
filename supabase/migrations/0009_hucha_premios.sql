-- 0009 · La hucha: recompensas familiares canjeables (D-06)
--
-- Las gemas son MONEDA, no premio. El premio de verdad lo decide cada familia
-- (elegir la peli del viernes, ir al parque, quedarse a dormir en casa de los
-- abuelos) y lo entrega el adulto, en el mundo real. La plataforma no toca dinero
-- nunca: solo lleva la cuenta.
--
-- DOS ECONOMÍAS QUE NO CHOCAN
--   · gemas del día a día → se gastan en minijuegos (viven en el dispositivo)
--   · hucha              → se llena con TODAS las gemas ganadas en la vida del
--                          perfil y solo se vacía cuando el adulto entrega un
--                          premio de verdad
--
-- La hucha no necesita un contador nuevo: es la suma de las gemas de pm_resultados
-- menos lo ya canjeado. Así cuadra sola entre el móvil del adulto y la tablet del
-- peque, sin nada que sincronizar.
--
-- Se premia la CONSTANCIA, nunca el acierto: las gemas de un ejercicio guiado
-- cuentan igual que las de uno perfecto, y eso no cambia aquí.

create table if not exists public.pm_premios (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  perfil     text not null,
  nombre     text not null,
  coste      integer not null check (coste > 0 and coste <= 5000),
  activo     boolean not null default true
);
create index if not exists pm_premios_fam_idx on public.pm_premios (familia, perfil, activo);

create table if not exists public.pm_canjes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  perfil     text not null,
  premio_id  uuid,
  nombre     text not null,   -- copia del nombre: si se borra el premio, el canje se sigue entendiendo
  coste      integer not null check (coste > 0)
);
create index if not exists pm_canjes_fam_idx on public.pm_canjes (familia, perfil, created_at desc);

alter table public.pm_premios enable row level security;
alter table public.pm_canjes  enable row level security;

drop policy if exists pm_pre_sel on public.pm_premios;
drop policy if exists pm_pre_ins on public.pm_premios;
drop policy if exists pm_pre_upd on public.pm_premios;
drop policy if exists pm_pre_del on public.pm_premios;
create policy pm_pre_sel on public.pm_premios for select to anon using (familia = familia_peticion());
create policy pm_pre_ins on public.pm_premios for insert to anon with check (familia = familia_peticion());
create policy pm_pre_upd on public.pm_premios for update to anon
  using (familia = familia_peticion()) with check (familia = familia_peticion());
create policy pm_pre_del on public.pm_premios for delete to anon using (familia = familia_peticion());

-- Los canjes se crean y se leen, pero NO se editan ni se borran: si el peque se
-- ganó su premio, eso no se deshace.
drop policy if exists pm_can_sel on public.pm_canjes;
drop policy if exists pm_can_ins on public.pm_canjes;
create policy pm_can_sel on public.pm_canjes for select to anon using (familia = familia_peticion());
create policy pm_can_ins on public.pm_canjes for insert to anon with check (familia = familia_peticion());
