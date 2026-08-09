# Base de datos de PequeMisiones

Aquí vive, en texto y versionado, **todo lo que hace el servidor**: las tablas, quién
puede ver y tocar cada fila (RLS), los disparadores que protegen la moderación y el
código de las dos funciones que hablan con la IA.

Hasta el 5-ago-2026 esto solo existía dentro del panel de Supabase: no se podía leer,
ni revisar, ni recuperar si el proyecto se perdía. Ahora sí.

## Qué hay

```
migrations/   el esquema y la seguridad, en orden (0001 → 0011)
functions/    el código de las edge functions (moderar, ayudante y rotar)
```

Los ficheros son un **volcado fiel del estado en vivo** a 5-ago-2026, no el histórico
de cómo se llegó hasta aquí: describen cómo tiene que quedar la base de datos, y están
escritos para poder ejecutarse más de una vez sin romper nada (`if not exists`,
`create or replace`, `drop ... if exists` antes de crear).

## Cómo se levanta de cero

Proyecto en producción: `tyoavvibplxkevxkamsb` (eu-west-1).

1. Ejecutar los ficheros de `migrations/` en orden, del 0001 al 0011, en el editor SQL
   de Supabase.
2. Desplegar las funciones de `functions/` (Edge Functions → Deploy).
   - `moderar`: **con** verificación de JWT (la llama la propia base de datos).
   - `ayudante`: **sin** verificación de JWT (si no, el navegador falla en el preflight
     CORS antes de llegar a la función; la protección real está dentro: entrada saneada,
     30 pistas/día por familia y 500/día globales).
   - `rotar`: **sin** verificación de JWT (mismo motivo CORS). Mueve el historial de una
     familia a un código nuevo; la protección está dentro: solo hacia códigos fuertes,
     límites de ritmo (3/día por familia, 40/día global) y auditoría en `pm_rotaciones`
     que permite deshacer cualquier rotación desde el panel.
3. Poner el secreto `ANTHROPIC_API_KEY` en Edge Functions → Secrets. Sin él, la
   moderación deja las misiones en `pendiente` (fail-closed, el niño no las ve) y el
   ayudante devuelve un ánimo enlatado en vez de una pista.

## Lo que NO está aquí (a propósito)

- **La clave de servicio (`service_role`)** y la **clave de la API de Anthropic**. Viven
  solo en los secretos de Supabase. Si alguna aparece alguna vez en un fichero de este
  repo, hay que rotarla ese mismo día.
- La clave `anon` sí aparece: es pública por diseño (va dentro de cada `index.html`) y
  no da acceso a nada por sí sola — la puerta la abre la cabecera `x-familia`.

## La llave de familia

El código de familia (`x-familia`) **es la llave**: RLS compara contra él en cada fila.
Los códigos de la primera época (`LUNA-847`) tenían 18.000 combinaciones y se podían
barrer con la clave pública; el portal ya solo genera códigos `PALABRA-XXXX-XXXX`
(~10^13) y ofrece «reforzar» a las familias antiguas, que llama a `rotar` (migración
0011). Vigilado por `pruebas/codigo-familia.test.js` y `pruebas/aislamiento.test.js`.

Límite que queda, documentado: la llave sigue siendo compartida y permanente — no se
puede expulsar UN dispositivo, solo rotar la llave entera. El siguiente paso (Auth
anónima por dispositivo + tabla de miembros) sigue en el roadmap para antes de cobrar.

## Aviso

El proyecto gratuito de Supabase **se pausa tras ~1 semana sin uso**. Si la app "no
conecta", lo primero que hay que mirar es si el proyecto está en pausa y restaurarlo.
