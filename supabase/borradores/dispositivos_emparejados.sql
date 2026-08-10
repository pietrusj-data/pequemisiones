-- 0011 · Emparejamiento de dispositivos: se acabó la llave permanente
--
-- EL PROBLEMA QUE ARREGLA (riesgo R7 de la EIPD, el más alto del sistema)
-- Hasta ahora, el código de familia (LUNA-847) ERA la llave: iba escrito en la
-- pantalla del portal, cualquiera que lo viera entraba, valía para siempre y no
-- se podía revocar sin cambiárselo a toda la familia. En una separación, eso es
-- exactamente el problema.
--
-- CÓMO QUEDA
--   · Cada dispositivo tiene SU PROPIO secreto largo, que nunca se enseña ni se
--     dicta: se genera en el aparato y no sale de él (al servidor solo llega su
--     huella, y con la huella no se puede entrar).
--   · Un dispositivo nuevo entra con un CÓDIGO DE UN SOLO USO que caduca en 10
--     minutos y lo genera un dispositivo ya emparejado.
--   · Cada dispositivo se puede revocar por separado, sin tocar a los demás.
--   · El código de familia se queda solo como nombre bonito para el histórico.
--
-- LO QUE ESTO TODAVÍA NO DA: recuperar la familia si se pierden todos los
-- dispositivos. Para eso hace falta una cuenta del adulto (Supabase Auth), que
-- está bloqueada hasta que se active un proveedor en el panel del proyecto.
-- Mientras tanto, al crear la familia se entrega un código de recuperación.

create table if not exists public.pm_dispositivos (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  familia     text not null,
  nombre      text not null default 'Dispositivo',
  rol         text not null default 'peque' check (rol in ('adulto','peque')),
  huella      text not null unique,          -- sha256 del secreto: el secreto NUNCA se guarda
  ultimo_uso  timestamptz,
  revocado    boolean not null default false
);
create index if not exists pm_disp_familia on public.pm_dispositivos (familia, revocado);

create table if not exists public.pm_vinculos (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  familia    text not null,
  codigo     text not null,
  rol        text not null default 'peque' check (rol in ('adulto','peque')),
  expira     timestamptz not null,
  usado      boolean not null default false,
  intentos   integer not null default 0
);
create index if not exists pm_vinc_codigo on public.pm_vinculos (codigo, expira);

alter table public.pm_dispositivos enable row level security;
alter table public.pm_vinculos     enable row level security;
-- Sin ninguna política: estas dos tablas NO se tocan directamente desde el
-- cliente. Solo se usan a través de las funciones de abajo.

-- Interruptor para apagar el modo antiguo cuando toda la familia esté migrada.
create table if not exists public.pm_config (
  clave text primary key,
  valor text not null
);
insert into public.pm_config(clave, valor) values ('llave_antigua','on')
  on conflict (clave) do nothing;
alter table public.pm_config enable row level security;  -- sin políticas: solo el servidor

/* ── Quién hace esta petición ─────────────────────────────────────────────
   Devuelve la familia del dispositivo que manda la cabecera x-dispositivo.
   El secreto llega en la cabecera y se compara por su huella: aunque alguien
   se llevara la base de datos entera, no podría entrar con lo que hay dentro. */
create or replace function public.dispositivo_peticion()
returns text
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select d.familia
    from public.pm_dispositivos d
   where d.revocado = false
     and d.huella = encode(digest(
           coalesce(nullif(current_setting('request.headers', true)::json->>'x-dispositivo',''), '·nada·'),
           'sha256'), 'hex')
   limit 1;
$$;

/* La familia de la petición: primero el dispositivo emparejado y, mientras dure
   la transición, el código a secas. Para cerrar el modo antiguo:
       update pm_config set valor='off' where clave='llave_antigua';   */
create or replace function public.familia_peticion()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    public.dispositivo_peticion(),
    case when (select valor from public.pm_config where clave='llave_antigua') = 'on'
         then nullif(current_setting('request.headers', true)::json->>'x-familia', '')
         else null end
  );
$$;

/* ── Crear una familia (primer dispositivo) ──────────────────────────────
   El aparato genera su secreto y manda SOLO la huella: el servidor jamás llega
   a ver el secreto. Devuelve el código de familia, que a partir de ahora es un
   nombre, no una contraseña. */
create or replace function public.pm_crear_familia(p_huella text, p_nombre text default 'Este dispositivo')
returns table(familia text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cod text;
  palabras text[] := array['LUNA','SOL','MAR','NUBE','RIO','BOSQUE','ESTRELLA','CIELO','FLOR','MONTE'];
begin
  if p_huella is null or length(p_huella) <> 64 then
    raise exception 'huella_invalida';
  end if;
  loop
    cod := palabras[1 + floor(random()*array_length(palabras,1))::int] || '-' || lpad(floor(random()*900+100)::text, 3, '0');
    exit when not exists (select 1 from public.pm_dispositivos d where d.familia = cod);
  end loop;
  insert into public.pm_dispositivos(familia, nombre, rol, huella, ultimo_uso)
    values (cod, coalesce(nullif(p_nombre,''),'Este dispositivo'), 'adulto', p_huella, now());
  return query select cod;
end $$;

/* ── Generar un código de emparejamiento (desde un dispositivo de adulto) ── */
create or replace function public.pm_crear_vinculo(p_rol text default 'peque')
returns table(codigo text, expira timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  fam text;
  esAdulto boolean;
  cod text;
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin O/0 ni I/1: se dictan por teléfono
  i int;
begin
  fam := public.dispositivo_peticion();
  if fam is null then raise exception 'dispositivo_no_emparejado'; end if;
  select (d.rol = 'adulto') into esAdulto
    from public.pm_dispositivos d
   where d.familia = fam and d.revocado = false
     and d.huella = encode(extensions.digest(current_setting('request.headers', true)::json->>'x-dispositivo','sha256'),'hex');
  if not coalesce(esAdulto,false) then raise exception 'solo_un_adulto_puede_vincular'; end if;

  cod := '';
  for i in 1..8 loop
    cod := cod || substr(alfabeto, 1 + floor(random()*length(alfabeto))::int, 1);
  end loop;
  -- un código vivo por familia: pedir uno nuevo invalida el anterior
  update public.pm_vinculos set usado = true where familia = fam and usado = false;
  insert into public.pm_vinculos(familia, codigo, rol, expira)
    values (fam, cod, case when p_rol = 'adulto' then 'adulto' else 'peque' end, now() + interval '10 minutes');
  return query select cod, (now() + interval '10 minutes')::timestamptz;
end $$;

/* ── Canjear el código desde el dispositivo nuevo ───────────────────────── */
create or replace function public.pm_canjear_vinculo(p_codigo text, p_huella text, p_nombre text default 'Dispositivo')
returns table(familia text, rol text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare v record;
begin
  if p_huella is null or length(p_huella) <> 64 then raise exception 'huella_invalida'; end if;

  select * into v from public.pm_vinculos
   where codigo = upper(trim(p_codigo)) and usado = false and expira > now()
   order by created_at desc limit 1;

  if v is null then
    -- se cuentan los intentos fallidos para poder detectar a quien pruebe a lo bruto
    update public.pm_vinculos set intentos = intentos + 1
      where codigo = upper(trim(p_codigo));
    raise exception 'codigo_no_valido';
  end if;

  update public.pm_vinculos set usado = true where id = v.id;
  insert into public.pm_dispositivos(familia, nombre, rol, huella, ultimo_uso)
    values (v.familia, coalesce(nullif(p_nombre,''),'Dispositivo'), v.rol, p_huella, now());
  return query select v.familia, v.rol;
end $$;

/* ── Ver y revocar los dispositivos de la familia ───────────────────────── */
create or replace function public.pm_mis_dispositivos()
returns table(id uuid, nombre text, rol text, created_at timestamptz, ultimo_uso timestamptz, soy_yo boolean)
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select d.id, d.nombre, d.rol, d.created_at, d.ultimo_uso,
         d.huella = encode(digest(coalesce(current_setting('request.headers', true)::json->>'x-dispositivo',''),'sha256'),'hex') as soy_yo
    from public.pm_dispositivos d
   where d.revocado = false
     and d.familia = public.dispositivo_peticion()
   order by d.created_at;
$$;

create or replace function public.pm_revocar_dispositivo(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare fam text; esAdulto boolean; yo boolean;
begin
  fam := public.dispositivo_peticion();
  if fam is null then raise exception 'dispositivo_no_emparejado'; end if;
  select (d.rol='adulto') into esAdulto from public.pm_dispositivos d
   where d.familia = fam and d.revocado = false
     and d.huella = encode(digest(current_setting('request.headers', true)::json->>'x-dispositivo','sha256'),'hex');
  if not coalesce(esAdulto,false) then raise exception 'solo_un_adulto_puede_revocar'; end if;
  -- nadie se puede echar a sí mismo por error y quedarse fuera de su propia familia
  select (d.huella = encode(digest(current_setting('request.headers', true)::json->>'x-dispositivo','sha256'),'hex'))
    into yo from public.pm_dispositivos d where d.id = p_id;
  if coalesce(yo,false) then raise exception 'no_puedes_revocarte_a_ti_mismo'; end if;
  update public.pm_dispositivos set revocado = true where id = p_id and familia = fam;
  return found;
end $$;

/* Estas funciones son la única puerta: se pueden llamar sin estar dentro, pero
   cada una comprueba por su cuenta quién llama. */
grant execute on function public.pm_crear_familia(text,text)        to anon;
grant execute on function public.pm_crear_vinculo(text)             to anon;
grant execute on function public.pm_canjear_vinculo(text,text,text) to anon;
grant execute on function public.pm_mis_dispositivos()              to anon;
grant execute on function public.pm_revocar_dispositivo(uuid)       to anon;

-- Los códigos caducados se limpian solos.
create or replace function public.pm_limpia_vinculos()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  delete from public.pm_vinculos where expira < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.pm_limpia_vinculos() from public, anon, authenticated;

select cron.unschedule('pm_limpia_vinculos')
  where exists (select 1 from cron.job where jobname = 'pm_limpia_vinculos');
select cron.schedule('pm_limpia_vinculos', '23 4 * * *', $l$ select public.pm_limpia_vinculos() $l$);
