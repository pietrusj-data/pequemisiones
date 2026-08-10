-- 0015 · Gemas de papá: regalar o descontar moneda a distancia
--
-- Pedro quería premiar cosas del mundo real (recoger la mesa, deberes del
-- cole…) con gemas, y descontarlas cuando se canjea un premio de verdad.
-- También rescata saldos perdidos: la moneda vive en el localStorage del
-- dispositivo (el servidor solo guarda lo GANADO, no el saldo).
--
-- El adulto INSERTa un ajuste con motivo (lista cerrada del cliente, sin texto
-- libre → no necesita moderación) y la app del peque lo aplica al verlo:
-- primero marca la fila (condicionada a seguir pendiente, así dos dispositivos
-- no la suman dos veces) y solo entonces toca el saldo local. Sin borrado.
--
-- En el PORTAL los ajustes alimentan la HUCHA (0009): el saldo pasa a ser
-- resultados + ajustes − canjes, y no hay nada que "aplicar" en el dispositivo
-- (se insertan ya con estado 'aplicado'). En las apps de las niñas (mates_/jim_)
-- sí tocan el saldo jugable local y usan el estado pendiente→aplicado.

create table if not exists public.mates_ajustes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  delta       integer not null check (delta between -500 and 500 and delta <> 0),
  motivo      text not null default 'regalo',
  estado      text not null default 'pendiente',
  aplicado_at timestamptz
);
create table if not exists public.jim_ajustes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  delta       integer not null check (delta between -500 and 500 and delta <> 0),
  motivo      text not null default 'regalo',
  estado      text not null default 'pendiente',
  aplicado_at timestamptz
);
create table if not exists public.pm_ajustes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  familia     text not null,
  perfil      text not null,
  delta       integer not null check (delta between -500 and 500 and delta <> 0),
  motivo      text not null default 'regalo',
  estado      text not null default 'pendiente',
  aplicado_at timestamptz
);
create index if not exists pm_ajustes_fam_idx on public.pm_ajustes (familia, perfil, estado);

alter table public.mates_ajustes enable row level security;
alter table public.jim_ajustes   enable row level security;
alter table public.pm_ajustes    enable row level security;

-- Apps de las niñas: mismo modelo de confianza que el resto de mates_/jim_
-- (una sola familia con la clave pública). Todo menos borrar.
drop policy if exists mates_aj_sel on public.mates_ajustes;
drop policy if exists mates_aj_ins on public.mates_ajustes;
drop policy if exists mates_aj_upd on public.mates_ajustes;
create policy mates_aj_sel on public.mates_ajustes for select to anon using (true);
create policy mates_aj_ins on public.mates_ajustes for insert to anon with check (true);
create policy mates_aj_upd on public.mates_ajustes for update to anon using (true) with check (true);

drop policy if exists jim_aj_sel on public.jim_ajustes;
drop policy if exists jim_aj_ins on public.jim_ajustes;
drop policy if exists jim_aj_upd on public.jim_ajustes;
create policy jim_aj_sel on public.jim_ajustes for select to anon using (true);
create policy jim_aj_ins on public.jim_ajustes for insert to anon with check (true);
create policy jim_aj_upd on public.jim_ajustes for update to anon using (true) with check (true);

-- Portal: aislado por familia, como pm_misiones.
drop policy if exists pm_aj_sel on public.pm_ajustes;
drop policy if exists pm_aj_ins on public.pm_ajustes;
drop policy if exists pm_aj_upd on public.pm_ajustes;
create policy pm_aj_sel on public.pm_ajustes for select to anon
  using (familia = familia_peticion());
create policy pm_aj_ins on public.pm_ajustes for insert to anon
  with check (familia = familia_peticion());
create policy pm_aj_upd on public.pm_ajustes for update to anon
  using (familia = familia_peticion()) with check (familia = familia_peticion());
