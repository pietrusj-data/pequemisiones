-- 0001 · Extensiones que necesita el proyecto
-- pgcrypto  → gen_random_uuid() para las claves primarias
-- pg_net    → llamadas HTTP desde la base de datos (avisa a la función de moderación)
-- pg_cron   → el barrido que reintenta las misiones que se quedaron sin moderar

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net  with schema extensions;
create extension if not exists pg_cron;
