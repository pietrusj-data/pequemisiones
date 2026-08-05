-- 0006 · Registro de pistas del ayudante (D-07 fase 2 · 4-ago-2026)
--
-- Cuando el peque pulsa "💡 Pista", la edge function `ayudante` devuelve una
-- pista de MÉTODO (nunca el resultado) y la guarda aquí, para que el adulto la
-- vea en su panel de Resultados. La pista no marca el ejercicio como ayudado ni
-- toca las gemas: pedir ayuda no se penaliza.
--
-- SEGURIDAD: la tabla la escribe SOLO el servidor (la función, con la clave de
-- servicio). No hay política de INSERT para anon a propósito — así un cliente no
-- puede inventarse pistas ni ensuciar el panel del adulto. Leer, solo la familia.

create table if not exists public.pm_dudas (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  perfil     text not null,
  tipo       text not null,
  enunciado  text,
  pista      text not null
);
create index if not exists pm_dudas_familia_fecha on public.pm_dudas (familia, created_at desc);

alter table public.pm_dudas enable row level security;

drop policy if exists pm_dudas_select on public.pm_dudas;
create policy pm_dudas_select on public.pm_dudas
  for select using (familia = familia_peticion());

-- Sin política de INSERT/UPDATE/DELETE: solo la clave de servicio escribe aquí.
-- Los límites de uso (30 pistas/día por familia, 500/día globales) están dentro
-- de la función `ayudante`, no en la base de datos.
