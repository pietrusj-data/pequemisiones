-- 0012 · El plan Pro: suscripciones de Stripe por familia
--
-- Cada pago va asociado a la "cuenta" del producto, que es el CÓDIGO DE FAMILIA
-- (aquí no hay cuentas con email). El flujo entero:
--
--   1. En la zona de padres, el adulto toca "Hazte Pro" → se abre un Payment
--      Link de Stripe con ?client_reference_id=<código de familia>.
--   2. Stripe cobra (tarjeta, Apple Pay, Google Pay…). El email del pago se lo
--      queda Stripe para sus recibos: A NUESTRA BASE DE DATOS NO LLEGA NUNCA.
--   3. Stripe avisa a la edge function `pago-webhook` (firma verificada), que
--      escribe aquí la suscripción con service_role.
--   4. La app pregunta su propia fila con su cabecera x-familia y sabe si la
--      familia es Pro y hasta cuándo.
--
-- Solo escribe el webhook: la familia únicamente LEE su fila. Nadie puede
-- hacerse Pro tocando la base de datos con la clave pública.

create table if not exists public.pm_suscripciones (
  familia         text primary key,
  estado          text not null default 'activa',  -- activa | impago | cancelada
  plan            text,                            -- mensual | anual
  hasta           timestamptz,                     -- fin del periodo ya pagado
  stripe_customer text,
  stripe_sub      text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.pm_suscripciones enable row level security;

drop policy if exists pm_susc_sel on public.pm_suscripciones;
create policy pm_susc_sel on public.pm_suscripciones
  for select to anon
  using (familia = public.familia_peticion());
-- Sin políticas de insert/update/delete: escribe solo service_role (el webhook).
