-- 0003 · Lista de espera de la landing (Fase 0)
--
-- Único sitio del proyecto con un dato personal de verdad: el email de un adulto
-- que pide aviso del lanzamiento. Por eso la política es SOLO INSERT: cualquiera
-- puede apuntarse, NADIE puede leer la lista con la clave anon. Los emails se
-- consultan desde el panel de Supabase o con la clave de servicio.
--
-- La columna `idioma` separa la landing española de la inglesa (/en/).

create table if not exists public.pm_interesados (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email      text not null unique,
  curso      text,
  pagaria    text,
  comentario text,
  idioma     text not null default 'es'
);

alter table public.pm_interesados enable row level security;

drop policy if exists pm_interesados_insert on public.pm_interesados;
create policy pm_interesados_insert on public.pm_interesados
  for insert to anon with check (true);

-- Deliberadamente NO hay política de SELECT, UPDATE ni DELETE para anon.
