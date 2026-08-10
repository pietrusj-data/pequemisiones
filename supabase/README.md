# Base de datos de PequeMisiones

Aquí vive, en texto y versionado, **todo lo que hace el servidor**: las tablas, quién
puede ver y tocar cada fila (RLS), los disparadores que protegen la moderación y el
código de las dos funciones que hablan con la IA.

Hasta el 5-ago-2026 esto solo existía dentro del panel de Supabase: no se podía leer,
ni revisar, ni recuperar si el proyecto se perdía. Ahora sí.

## Qué hay

```
migrations/   el esquema y la seguridad, en orden (0001 → 0014)
functions/    el código de las edge functions (moderar, ayudante, rotar y pago-webhook)
```

Los ficheros son un **volcado fiel del estado en vivo** a 5-ago-2026, no el histórico
de cómo se llegó hasta aquí: describen cómo tiene que quedar la base de datos, y están
escritos para poder ejecutarse más de una vez sin romper nada (`if not exists`,
`create or replace`, `drop ... if exists` antes de crear).

## Cómo se levanta de cero

Proyecto en producción: `tyoavvibplxkevxkamsb` (eu-west-1).

1. Ejecutar los ficheros de `migrations/` en orden, del 0001 al 0014, en el editor SQL
   de Supabase.
2. Desplegar las funciones de `functions/` (Edge Functions → Deploy).
   - `moderar`: **con** verificación de JWT (la llama la propia base de datos). Desde
     0013 modera también las apps de las niñas: el aviso trae `{id, tabla}` y la
     función solo acepta `pm_misiones`, `mates_misiones` y `jim_misiones`.
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

## Cobros (plan Pro, Stripe)

La "cuenta" a la que va asociado cada pago es el **código de familia**: no hay
cuentas con email. El Payment Link de Stripe viaja con
`?client_reference_id=<código>`, la función `pago-webhook` verifica la firma del
aviso de Stripe y apunta la suscripción en `pm_suscripciones` (migración 0012);
la app lee su propia fila con su cabecera `x-familia`. El email del comprador se
queda en Stripe: aquí no llega nunca. Reforzar el código mueve también la
suscripción (`rotar` incluye la tabla).

Para ponerlo en marcha:

1. Cuenta de Stripe → un producto "PequeMisiones Pro" con dos precios
   (mensual y anual) → un **Payment Link** por precio.
2. Pegar los dos enlaces en `STRIPE_LINK_MENSUAL` / `STRIPE_LINK_ANUAL` de
   `app/primaria.html` y `app/infantil.html` (mientras estén vacíos, la caja
   Pro no se enseña: el producto sigue gratis).
3. En Stripe → Developers → Webhooks: endpoint
   `https://tyoavvibplxkevxkamsb.supabase.co/functions/v1/pago-webhook`
   con los eventos `checkout.session.completed`,
   `customer.subscription.updated` y `customer.subscription.deleted`.
4. Secretos en Edge Functions → Secrets: `STRIPE_SECRET_KEY` (sk_…) y
   `STRIPE_WEBHOOK_SECRET` (whsec_… del endpoint).
5. Desplegar `pago-webhook` **sin** verificación de JWT (Stripe no manda JWT;
   la protección es la firma del webhook).

Qué es de pago y qué es gratis dentro de la app: **decisión pendiente** — el
flag `esPro` ya queda disponible en ambos motores para cerrar módulos o cupos
cuando se decida.

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
