# Borradores de base de datos (NO se aplican)

Lo que hay aquí es SQL escrito y razonado, pero **aparcado a propósito**. No está
en `../migrations/` para que nadie lo aplique por error ni entre en la cuenta de
numeración. Si algún día se retoma, se le pone número nuevo y se mueve.

## `dispositivos_emparejados.sql` — RETOMADO el 20-ago-2026 como `0017`

Escrito el 5-ago-2026, aparcado el 10-ago (la rotación de códigos `0011` resolvió
el problema urgente por otro camino), y **retomado y rehecho el 20-ago** como
`../migrations/0017_dispositivos_emparejados.sql`, ya aplicado en producción.
El archivo del borrador se retiró de esta carpeta: lo que vale es la 0017.

Diferencias del rehecho respecto al borrador:
- No trae `pm_crear_familia` (los códigos fuertes los genera el portal desde 0011).
- `familia_peticion()` mantiene el modo antiguo con el interruptor
  `pm_config.llave_antigua` (encendido): x-familia sigue funcionando hasta que
  toda la familia esté emparejada.
- Los vínculos y revocaciones también los puede emitir el **dueño de la familia
  desde su cuenta** (0016, Supabase Auth): eso resuelve el "si el peque borra el
  localStorage, muere" que mató al borrador, y el arranque sin huevo-y-gallina.
- La rotación (`rotar` v2) arrastra `pm_cuentas`, `pm_dispositivos` y
  `pm_vinculos`.
