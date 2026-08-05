# PequeMisiones

App educativa que convierte los deberes escolares en misiones gamificadas, para
niños de 3 a 8 años y sus familias. Mercado inicial: España.

**No es una plataforma de ejercicios: es una plataforma de acompañamiento familiar
al aprendizaje.** El cliente es la familia entera, no el niño. La promesa no es
"más ejercicios", es *menos discusiones en casa*.

🌐 **https://pietrusj-data.github.io/pequemisiones/**

## Qué hay en este repositorio

| Carpeta | Qué es |
|---|---|
| `index.html` | Landing en español + lista de espera |
| `en/` | Landing gemela en inglés (marca **PequeMissions**) |
| `app/` | **El producto**: portal de perfiles + los dos motores (`primaria.html`, `infantil.html`) |
| `demo-primaria/`, `demo-infantil/` | Escaparate: redirigen al motor con `?demo=1` (no son copias) |
| `pruebas/` | Pruebas automáticas: `node --test pruebas/` |
| `rejillas/`, `tabla-100/` | Herramientas ABN gratuitas (entrada por buscador) |
| `confianza/`, `privacidad/` | Páginas legales y de transparencia |
| `supabase/` | Esquema, seguridad (RLS) y edge functions del servidor |

## Los cuatro diferenciadores

1. **Misiones a distancia con el mensaje del adulto**, que la app lee en voz alta
   al niño. Es el corazón del producto.
2. **Las gemas son moneda, no premio.** El premio real lo pacta cada familia. La
   app jamás toca dinero, y se premia la constancia, nunca el acierto.
3. **Modo padres para el método ABN**: qué está aprendiendo tu hijo y cómo ayudarle
   sin hacerle los deberes.
4. **Anti-frustración radical**: acierto guiado, nunca hay rojo, los ayudados
   también puntúan.

## Cómo funciona por dentro

Sin build ni dependencias: cada pantalla es un `index.html` con HTML, CSS y JS en
línea, instalable como PWA. **Los motores del portal son la única versión del
producto**: la demo pública es ese mismo motor arrancado con `?demo=1` (sin red,
sin misiones y sin zona de padres), no una copia que pueda quedarse atrás. El servidor es Supabase (REST con `fetch` y clave
pública), con cola offline en `localStorage` para que nunca se pierda un ejercicio
por falta de cobertura.

**Privacidad por diseño:** los perfiles de los niños viven solo en el dispositivo.
Al servidor solo llega un seudónimo y un código de familia opaco (tipo `LUNA-847`).
Ni el administrador puede saber cómo se llama un niño. Detalle en `privacidad/`.

**Seguridad del canal de mensajes:** ninguna misión llega al niño sin que su texto
pase una comprobación automática en el servidor; si algo falla, la misión se queda
retenida (nunca se aprueba sola). Ver `supabase/migrations/0005_moderacion_mensaje.sql`.

## Trabajar en local

```bash
python -m http.server 8796
```

Y abrir `http://localhost:8796/`. Antes de subir nada, pasar la comprobación de
salud (sintaxis, sincronía entre copias del motor, promesas de la landing y
seguridad del portal):

```powershell
powershell -File ../scripts/comprobar.ps1
```

Publicar = `git push` a `main`; GitHub Pages reconstruye en 1-3 minutos.

⚠️ El proyecto gratuito de Supabase se pausa tras ~1 semana sin uso. Si la app "no
conecta", lo primero es mirar si está en pausa.

## Licencia

Código propietario. Ver [LICENSE](LICENSE). El repositorio es público para que
GitHub Pages pueda servirlo, no para su reutilización.
