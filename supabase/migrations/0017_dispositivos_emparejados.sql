-- 0017 · Emparejamiento por dispositivo: el código pasa de llave a nombre
--
-- Retoma el borrador del 5-ago (aparcado el 10-ago), REHECHO sobre lo que ya
-- existe: la rotación de códigos (0011) y la cuenta del adulto (0016). Ataca el
-- riesgo R7 de la EIPD, el más alto del sistema: el código de familia ERA la
-- llave — se ve en pantalla, vale para siempre y no se puede echar a UN
-- dispositivo suelto (en una separación, ese es exactamente el problema).
--
-- CÓMO QUEDA
--   · Cada dispositivo genera SU secreto largo, que nunca sale del aparato: al
--     servidor solo llega su huella sha256, y con la huella no se entra.
--   · Un dispositivo nuevo se une con un CÓDIGO DE UN SOLO USO que caduca en
--     10 minutos. Lo genera un dispositivo adulto ya emparejado… o el dueño de
--     la familia desde su cuenta (0016) — así se arranca sin huevo-y-gallina y
--     así se recupera todo si se pierden los aparatos (lo que mató al borrador
--     de agosto: "si el peque borra el localStorage, muere"; ahora se rehace
--     desde la cuenta).
--   · Cada dispositivo se puede revocar por separado, sin tocar a los demás.
--   · TRANSICIÓN: el interruptor pm_config.llave_antigua ('on' hoy) mantiene
--     vivo el modo actual (cabecera x-familia). Los clientes mandan ya las dos
--     cabeceras; cuando toda la familia esté emparejada, se apaga a mano:
--         update pm_config set valor='off' where clave='llave_antigua';
--     y el código queda como nombre bonito, no como contraseña.
--   · La rotación (edge `rotar`) arrastra también pm_cuentas, pm_dispositivos
--     y pm_vinculos: reforzar el código no desempareja a nadie.

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

-- Interruptor para apagar el modo antiguo cuando toda la familia esté migrada.
create table if not exists public.pm_config (
  clave text primary key,
  valor text not null
);
insert into public.pm_config(clave, valor) values ('llave_antigua','on')
  on conflict (clave) do nothing;

alter table public.pm_dispositivos enable row level security;
alter table public.pm_vinculos     enable row level security;
alter table public.pm_config       enable row level security;
-- Sin ninguna política: estas tablas NO se tocan directamente desde el
-- cliente. Solo a través de las funciones de abajo (security definer).

/* ── ¿De qué familia es el dispositivo que llama? ─────────────────────────
   Lee la cabecera x-dispositivo (el secreto) y lo compara por huella: aunque
   alguien se llevara la base entera, dentro no hay nada con lo que entrar. */
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

/* La familia de la petición: primero el dispositivo emparejado y, mientras
   dure la transición, el código a secas (comportamiento idéntico al de hoy). */
create or replace function public.familia_peticion()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    public.dispositivo_peticion(),
    case when (select valor from public.pm_config where clave = 'llave_antigua') = 'on'
         then nullif(current_setting('request.headers', true)::json->>'x-familia', '')
         else null end
  );
$$;

/* ── ¿Quién llama, con qué autoridad? (interna, sin grant) ────────────────
   'dispositivo' = un aparato adulto emparejado y sin revocar.
   'cuenta'      = el dueño de la familia según 0016 (si tiene varias, que
                   diga cuál con p_familia). */
create or replace function public.pm_quien_llama(p_familia text default null)
returns table(familia text, via text)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_fam text;
  v_n   int;
begin
  select d.familia into v_fam
    from public.pm_dispositivos d
   where d.revocado = false and d.rol = 'adulto'
     and d.huella = encode(digest(
           coalesce(nullif(current_setting('request.headers', true)::json->>'x-dispositivo',''), '·nada·'),
           'sha256'), 'hex')
   limit 1;
  if v_fam is not null then
    return query select v_fam, 'dispositivo'::text; return;
  end if;
  if auth.uid() is not null then
    if p_familia is not null then
      select c.familia into v_fam from public.pm_cuentas c
       where c.dueno = auth.uid() and c.familia = upper(trim(p_familia));
      if v_fam is not null then return query select v_fam, 'cuenta'::text; end if;
      return;
    end if;
    select count(*) into v_n from public.pm_cuentas c where c.dueno = auth.uid();
    if v_n = 1 then
      select c.familia into v_fam from public.pm_cuentas c where c.dueno = auth.uid();
      return query select v_fam, 'cuenta'::text;
    end if;
  end if;
  return;
end;
$$;
revoke all on function public.pm_quien_llama(text) from public, anon, authenticated;

/* ── Generar un código de emparejamiento (adulto emparejado o dueño) ────── */
create or replace function public.pm_crear_vinculo(p_rol text default 'peque', p_familia text default null)
returns table(codigo text, expira timestamptz)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v record;
  cod text := '';
  alfabeto text := 'ABCDEFGHJKMNPQRSTWXYZ23456789'; -- el del portal: sin O/0, I/L/1, U/V
  i int;
begin
  select * into v from public.pm_quien_llama(p_familia);
  if v is null or v.familia is null then raise exception 'solo_un_adulto_puede_vincular'; end if;
  for i in 1..8 loop
    cod := cod || substr(alfabeto, 1 + floor(random()*length(alfabeto))::int, 1);
  end loop;
  -- un código vivo por familia: pedir uno nuevo invalida el anterior
  update public.pm_vinculos set usado = true where pm_vinculos.familia = v.familia and usado = false;
  insert into public.pm_vinculos(familia, codigo, rol, expira)
    values (v.familia, cod, case when p_rol = 'adulto' then 'adulto' else 'peque' end,
            now() + interval '10 minutes');
  return query select cod, (now() + interval '10 minutes')::timestamptz;
end;
$$;

/* ── Canjear el código desde el dispositivo nuevo ───────────────────────── */
create or replace function public.pm_canjear_vinculo(p_codigo text, p_huella text, p_nombre text default 'Dispositivo')
returns table(familia text, rol text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare v record;
begin
  if p_huella is null or p_huella !~ '^[0-9a-f]{64}$' then raise exception 'huella_invalida'; end if;

  select * into v from public.pm_vinculos pv
   where pv.codigo = upper(trim(p_codigo)) and pv.usado = false and pv.expira > now()
   order by pv.created_at desc limit 1;

  if v is null then
    -- se apuntan los intentos fallidos para ver a quien pruebe a lo bruto
    update public.pm_vinculos set intentos = intentos + 1
      where pm_vinculos.codigo = upper(trim(p_codigo));
    raise exception 'codigo_no_valido';
  end if;

  update public.pm_vinculos set usado = true where id = v.id;
  insert into public.pm_dispositivos(familia, nombre, rol, huella, ultimo_uso)
    values (v.familia, coalesce(nullif(trim(p_nombre),''),'Dispositivo'), v.rol, p_huella, now());
  return query select v.familia, v.rol;
end;
$$;

/* ── Ver y revocar los dispositivos de la familia ───────────────────────── */
create or replace function public.pm_mis_dispositivos(p_familia text default null)
returns table(id uuid, nombre text, rol text, created_at timestamptz, ultimo_uso timestamptz, soy_yo boolean)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $$
declare v_fam text;
begin
  -- cualquier dispositivo emparejado ve la lista de su familia…
  v_fam := public.dispositivo_peticion();
  if v_fam is null then
    -- …y el dueño, desde su cuenta, también (es parte de la recuperación)
    select q.familia into v_fam from public.pm_quien_llama(p_familia) q;
  end if;
  if v_fam is null then return; end if;
  return query
    select d.id, d.nombre, d.rol, d.created_at, d.ultimo_uso,
           d.huella = encode(digest(coalesce(nullif(current_setting('request.headers', true)::json->>'x-dispositivo',''), '·nada·'),'sha256'),'hex') as soy_yo
      from public.pm_dispositivos d
     where d.revocado = false and d.familia = v_fam
     order by d.created_at;
end;
$$;

create or replace function public.pm_revocar_dispositivo(p_id uuid, p_familia text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare v record; yo boolean;
begin
  select * into v from public.pm_quien_llama(p_familia);
  if v is null or v.familia is null then raise exception 'solo_un_adulto_puede_revocar'; end if;
  if v.via = 'dispositivo' then
    -- nadie se echa a sí mismo por error y se queda fuera de su propia familia
    select (d.huella = encode(digest(current_setting('request.headers', true)::json->>'x-dispositivo','sha256'),'hex'))
      into yo from public.pm_dispositivos d where d.id = p_id;
    if coalesce(yo, false) then raise exception 'no_puedes_revocarte_a_ti_mismo'; end if;
  end if;
  update public.pm_dispositivos set revocado = true
   where id = p_id and pm_dispositivos.familia = v.familia;
  return found;
end;
$$;

/* Estas funciones son la única puerta: se pueden llamar sin estar dentro,
   pero cada una comprueba por su cuenta quién llama. */
grant execute on function public.pm_crear_vinculo(text,text)             to anon, authenticated;
grant execute on function public.pm_canjear_vinculo(text,text,text)      to anon, authenticated;
grant execute on function public.pm_mis_dispositivos(text)               to anon, authenticated;
grant execute on function public.pm_revocar_dispositivo(uuid,text)       to anon, authenticated;

-- Los códigos caducados se limpian solos, mismo patrón que 0007/0010/0011.
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
end;
$$;
revoke all on function public.pm_limpia_vinculos() from public, anon, authenticated;

select cron.unschedule('pm_limpia_vinculos')
  where exists (select 1 from cron.job where jobname = 'pm_limpia_vinculos');
select cron.schedule('pm_limpia_vinculos', '23 4 * * *',
  $$select public.pm_limpia_vinculos()$$);
