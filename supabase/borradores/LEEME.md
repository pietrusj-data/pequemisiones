# Borradores de base de datos (NO se aplican)

Lo que hay aquí es SQL escrito y razonado, pero **aparcado a propósito**. No está
en `../migrations/` para que nadie lo aplique por error ni entre en la cuenta de
numeración. Si algún día se retoma, se le pone número nuevo y se mueve.

## `dispositivos_emparejados.sql` — aparcado el 10-ago-2026

Escrito el 5-ago-2026. Ataca el riesgo **R7 de la EIPD** (el más alto del
sistema): que el código de familia *sea* la llave — se ve en pantalla, vale para
siempre y no se puede revocar un dispositivo suelto sin cambiárselo a toda la
familia. En una separación, eso es exactamente el problema.

Su propuesta: un secreto largo por dispositivo que nunca sale del aparato (al
servidor solo llega su huella sha256), emparejamiento con código de un solo uso
que caduca a los 10 minutos, y revocación dispositivo a dispositivo.

**Por qué está aparcado.** El 9-ago se volvió a abrir el problema y se resolvió
por otro camino (`0011_rotacion_codigo.sql`): códigos fuertes
`PALABRA-XXXX-XXXX` (~10^13 combinaciones), vincular por enlace y rotación del
código con arrastre de todo el historial. Ese loop de diseño **descartó
explícitamente** la autenticación por dispositivo: obliga a migrar todas las
políticas RLS y se muere si el peque borra el `localStorage`.

**Ojo si se retoma:** este fichero redefine `familia_peticion()` para exigir la
cabecera `x-dispositivo` (con un interruptor `pm_config.llave_antigua` para la
transición). Aplicarlo tal cual **encima** de la rotación de códigos rompería el
RLS que hoy funciona. Hay que rehacerlo, no reciclarlo.

**Lo que sigue sin resolver** (y por lo que se guarda): la rotación no permite
revocar *un* dispositivo, ni recuperar la familia si se pierden todos. Eso sigue
pendiente y es el siguiente paso natural de seguridad.
