# Pruebas automáticas

Sin dependencias ni `npm install`: usan el probador que trae Node.

```bash
node --test pruebas/
```

Tarda unos 2 segundos. Si algo sale en rojo, **no se sube nada**.

## Qué se prueba

### `generadores.test.js` — que ningún ejercicio salga imposible

Recorta del propio `app/primaria.html` y `app/infantil.html` las funciones que
generan ejercicios y las ejecuta 400 veces por nivel. No comprueba resultados
concretos (los ejercicios son aleatorios a propósito), sino las reglas que no se
pueden romper nunca:

- **la respuesta correcta siempre está entre las opciones** que se le ofrecen al
  niño, y no hay dos opciones iguales — si esto falla, el peque no puede acertar
  aunque lo sepa;
- convención ABN: **el número mayor a la izquierda**;
- ninguna resta da negativo, ningún reparto pide algo imposible, ninguna serie
  cambia de paso a mitad;
- los niveles se quedan dentro de su rango (el nivel 1 no se va a tres cifras).

Prueba **el mismo código que juega la niña**, no una copia: si alguien edita un
generador, el test lo pilla.

### `aislamiento.test.js` — que ninguna familia vea a otra

Habla con la base de datos de verdad haciendo lo mismo que haría un atacante con
la clave pública (que va dentro de cada `index.html`, así que la tiene cualquiera):

- una familia crea su misión y la ve;
- **otra familia no la ve, no la modifica y no la borra**;
- sin código de familia no se ve absolutamente nada;
- no se puede colar una fila en la familia de otro;
- un cliente **no puede aprobarse su propio mensaje** (el veredicto de la
  moderación solo lo fija el servidor);
- **la lista de espera no se puede leer**: los emails no salen de ahí;
- las pistas del ayudante solo las escribe el servidor.

Crea una misión de mentira con familias `PRUEBAA-…` / `PRUEBAB-…` y **la borra al
terminar**. No toca ningún dato real. Si el proyecto de Supabase está pausado por
inactividad, avisa y se salta en vez de dar un falso fallo.

## Cómo se añade una prueba

Los generadores nuevos se prueban solos si se añaden a la lista `piezas` del motor
correspondiente en `motor.js`. Regla: **por cada generador con opciones, la primera
prueba es que la respuesta correcta esté entre ellas.**
