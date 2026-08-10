/*
 * Los tres juegos de premio nuevos, en un navegador DE VERDAD.
 *
 * Un juego no se puede probar como un generador: hay física, dedo y reloj. Aquí
 * se abre cada motor en Chromium, se entra en cada juego, se juega un rato de
 * mentira y se comprueba que pasa lo que tiene que pasar (que la nave recoge,
 * que el muñeco sube, que el lienzo pinta). Así se pilló que el muñeco de las
 * plataformas atravesaba las tablas en vez de rebotar.
 *
 * NO forma parte de `node --test pruebas/` a propósito: necesita Playwright, y
 * el resto del proyecto no tiene dependencias. Se lanza a mano cuando se toca
 * un juego:
 *
 *   python -m http.server 8796          (en la raíz del repo)
 *   node pruebas/navegador/juegos.mjs
 *
 * Con Playwright en otro sitio: PW=/ruta/a/playwright node pruebas/navegador/juegos.mjs
 */
const { chromium } = await import(process.env.PW || "playwright");

const BASE = (process.env.BASE || "http://127.0.0.1:8796") + "/app/";
const CHROME = process.env.CHROME || undefined;   // por defecto, el Chromium de Playwright
const TIROS = process.env.TIROS || null;          // carpeta donde dejar capturas (opcional)

const PERFIL_INF = {
  id:"p1", key:"peque-inf", alias:"Peque", genero:"nina", curso:"inf5", nivel:3,
  cursoNombre:"3º Infantil", tema:"unicornios",
  modulos:["num","sub","sil","tra","ret","ami","pal"],
  juegos:["globos","mariposas","naves","plataformas","dibujar"]
};
const PERFIL_PRI = { ...PERFIL_INF, id:"p2", key:"peque-pri", alias:"Peque2", curso:"pri1",
  nivel:1, cursoNombre:"1º Primaria", tema:"princesas", modulos:["abn","igu","dif","rel"] };

const JUEGOS = [
  { id:"naves",       pantalla:"s-naves",       zona:"naves-zona", reloj:"naves-tiempo", desde:"25" },
  { id:"plataformas", pantalla:"s-plataformas", zona:"plat-zona",  reloj:"plat-tiempo",  desde:"30" },
  { id:"dibujar",     pantalla:"s-dibujar",     zona:"dib-lienzo", lienzo:true }
];

const errores = [];
const esRed = t => /ERR_|Failed to load resource|net::/.test(t); // el servidor no hace falta para jugar

async function pruebaMotor(motor, perfil) {
  const navegador = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const ctx = await navegador.newContext({ viewport:{ width:820, height:1180 }, hasTouch:true });
  const pag = await ctx.newPage();
  pag.on("pageerror", e => errores.push(`${motor}: ERROR JS · ${e.message}`));
  pag.on("console", m => { if (m.type() === "error" && !esRed(m.text())) errores.push(`${motor}: consola · ${m.text()}`); });

  await pag.goto(BASE + "index.html");
  await pag.evaluate(p => {
    localStorage.setItem("pm_perfiles", JSON.stringify([p]));
    localStorage.setItem("pm_perfilActivo", JSON.stringify(p));
    localStorage.setItem("pm_familia", JSON.stringify("PRUEBA-001"));
  }, perfil);
  await pag.goto(BASE + motor + ".html");
  await pag.waitForTimeout(600);
  await pag.evaluate(() => { S.estrellas = 99; S.gemas = 99; S.sonido = false; guardar(); });

  for (const j of JUEGOS) {
    await pag.evaluate(() => go("s-premios"));
    await pag.waitForTimeout(200);
    if (!(await pag.locator("#btn-" + j.id).count())) { errores.push(`${motor}: no existe el botón de ${j.id}`); continue; }
    await pag.locator("#btn-" + j.id).click();
    await pag.waitForTimeout(900);

    const activa = await pag.evaluate(() => pantallaActual);
    if (activa !== j.pantalla) { errores.push(`${motor}/${j.id}: esperaba ${j.pantalla} y estoy en ${activa}`); continue; }

    // un dedo que se pasea por la zona de juego
    const caja = await pag.locator("#" + j.zona).boundingBox();
    if (caja) {
      await pag.mouse.move(caja.x + caja.width*0.3, caja.y + caja.height*0.5);
      await pag.mouse.down();
      for (let i = 0; i <= 12; i++) {
        await pag.mouse.move(caja.x + caja.width*(0.3 + 0.4*Math.sin(i/2)), caja.y + caja.height*(0.4 + 0.2*Math.cos(i/3)));
        await pag.waitForTimeout(120);
      }
      await pag.mouse.up();
    }

    if (j.id === "naves") {
      // llevar la nave debajo de la estrella más baja: tiene que recogerlas
      const cogidas = await pag.evaluate(async () => {
        for (let i = 0; i < 140; i++) {
          const est = Naves.items.filter(it => !it.polvo).sort((a, b) => b.y - a.y)[0];
          if (est) Naves.x = est.x;
          await new Promise(r => setTimeout(r, 50));
        }
        return Naves.n;
      });
      if (!cogidas) errores.push(`${motor}/naves: la nave pasó por encima de las estrellas y no cogió ninguna`);
      else console.log(`  ${motor}/naves → ${cogidas} estrellas recogidas`);
    }

    if (j.id === "plataformas") {
      // "dedo" automático que apunta a la tabla de arriba al subir y a la de
      // abajo al caer: es lo que hace el peque, y tiene que trepar varios pisos
      const subida = await pag.evaluate(async () => {
        const a = Plat.alto;
        for (let i = 0; i < 100; i++) {
          const lista = Plat.vy > 0
            ? Plat.sitios.filter(p => p.y > Plat.y + 20).sort((x, y) => x.y - y.y)
            : Plat.sitios.filter(p => p.y < Plat.y - 10).sort((x, y) => y.y - x.y);
          if (lista[0]) Plat.xObj = lista[0].x;
          await new Promise(r => setTimeout(r, 50));
        }
        return { a, b: Plat.alto };
      });
      if (!(subida.b > subida.a + 300)) {
        errores.push(`${motor}/plataformas: apenas sube (${Math.round(subida.a)} → ${Math.round(subida.b)}); ¿está atravesando las tablas?`);
      } else console.log(`  ${motor}/plataformas → subió de ${Math.round(subida.a)} a ${Math.round(subida.b)}`);
    }

    if (j.lienzo) {
      const pintado = await pag.evaluate(() => {
        const c = document.getElementById("dib-lienzo");
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let noBlancos = 0;
        for (let i = 0; i < d.length; i += 40) if (d[i] < 240 || d[i+1] < 240 || d[i+2] < 240) noBlancos++;
        return { noBlancos, ancho: c.width, alto: c.height };
      });
      if (!pintado.ancho || !pintado.alto) errores.push(`${motor}/dibujar: el lienzo salió de tamaño cero`);
      else if (!pintado.noBlancos) errores.push(`${motor}/dibujar: el dedo pasó por el lienzo y no pintó nada`);
      else console.log(`  ${motor}/dibujar → lienzo de ${pintado.ancho}×${pintado.alto} con pintura`);
    }

    if (j.reloj) {
      const t = await pag.evaluate(id => document.getElementById(id).textContent, j.reloj);
      if (t === j.desde) errores.push(`${motor}/${j.id}: el reloj no corre (sigue en ${t})`);
    }

    if (TIROS) await pag.screenshot({ path: `${TIROS}/${motor}-${j.id}.png` });
    await pag.locator("#btn-salir-" + j.id).click();
    await pag.waitForTimeout(700);
  }
  await navegador.close();
}

const soloEste = process.argv[2];
if (!soloEste || soloEste === "infantil") { console.log("Juegos del motor de infantil…"); await pruebaMotor("infantil", PERFIL_INF); }
if (!soloEste || soloEste === "primaria") { console.log("Juegos del motor de primaria…"); await pruebaMotor("primaria", PERFIL_PRI); }

if (errores.length) { console.log("\n✗ FALLOS:\n" + errores.map(e => "  · " + e).join("\n")); process.exit(1); }
console.log("\n✓ Los tres juegos arrancan, se juegan y se salen en los dos motores");
