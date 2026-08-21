-- 0016 · Cuenta del adulto (Supabase Auth): la familia gana un dueño formal
--
-- Hasta hoy la familia solo existía como un código: quien lo sabe, entra; y si
-- se pierden todos los dispositivos (o se borra el navegador), no hay manera de
-- recuperarlo. Además, cuando llegue el plan Pro, la suscripción necesita un
-- titular estable al que agarrarse aunque el código rote.
--
-- Esta migración añade lo MÍNIMO: el adulto entra con su email (enlace mágico,
-- sin contraseñas que guardar) y RECLAMA su familia demostrando que conoce el
-- código. Nada más cambia: el RLS de los datos de los peques sigue igual
-- (x-familia) y los dispositivos entran como siempre. La cuenta da dos cosas:
--   · recuperación: con el email se vuelve a leer el código de familia;
--   · titularidad: el ancla para Stripe y, en 0017, la puerta para emparejar
--     y revocar dispositivos.
--
-- Privacidad: el email vive en auth.users (Supabase); aquí solo se guarda la
-- pareja familia↔cuenta. Sigue sin haber ni un dato del menor.
--
-- Regla de reclamo: la prueba de posesión es conocer el código (~10^13
-- combinaciones, no se adivina). La primera cuenta que reclama se queda la
-- familia; las siguientes reciben un error claro. Un traspaso de dueño es una
-- operación de soporte (service_role) a propósito: no hay botón para robar
-- familias. La rotación del código (0011) arrastra también esta tabla, así que
-- reforzar el código no cambia quién es el dueño.

create table if not exists public.pm_cuentas (
  familia    text primary key,
  dueno      uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists pm_cuentas_dueno on public.pm_cuentas (dueno);

alter table public.pm_cuentas enable row level security;

-- El dueño ve SUS familias: eso ES la recuperación (entrar con el email y leer
-- el código). Nadie escribe directamente: solo la función de reclamar.
drop policy if exists pm_cuentas_dueno_lee on public.pm_cuentas;
create policy pm_cuentas_dueno_lee on public.pm_cuentas
  for select to authenticated using (dueno = auth.uid());

create or replace function public.pm_reclamar_familia(p_codigo text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cod   text;
  v_dueno uuid;
begin
  if auth.uid() is null then raise exception 'hay_que_iniciar_sesion'; end if;
  v_cod := upper(trim(coalesce(p_codigo, '')));
  -- mismo formato que acepta el portal y el webhook de pago
  if v_cod !~ '^[A-ZÑ]{2,12}(-[A-ZÑ0-9]{3,6}){1,3}$' then
    raise exception 'codigo_no_valido';
  end if;
  select dueno into v_dueno from public.pm_cuentas where familia = v_cod;
  if found then
    if v_dueno = auth.uid() then return 'ya_era_tuya'; end if;
    raise exception 'ya_tiene_dueno';
  end if;
  insert into public.pm_cuentas(familia, dueno) values (v_cod, auth.uid());
  return 'reclamada';
end;
$$;

revoke all on function public.pm_reclamar_familia(text) from public, anon;
grant execute on function public.pm_reclamar_familia(text) to authenticated;
