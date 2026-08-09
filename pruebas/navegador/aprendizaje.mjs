/*
 * Las tres reglas de aprendizaje que salieron viendo jugar a dos niñas de verdad,
 * comprobadas en un navegador porque viven en la interfaz, no en los generadores:
 *
 *   1. tras fallar, la rejilla de opciones se congela un momento (tocar a lo loco
 *      ya no es más rápido que pensar) y luego se suelta;
 *   2. lo que se falla queda apuntado para repasarlo al final de la tanda;
 *   3. el portal premarca los módulos del curso y deja cambiarlos después, y a un
 *      peque de 1º no le caen multiplicaciones de mayores.
 *
 * NO forma parte de `node --test pruebas/` a propósito: necesita Playwright, y el
 * resto del proyecto no tiene dependencias.
 *
 *   python -m http.server 8796          (en la raíz del repo)
 *   node pruebas/navegador/aprendizaje.mjs
 */
const { chromium } = await import(process.env.PW || "playwright");

const BASE = (process.env.BASE || "http://127.0.0.1:8796") + "/app/";
const CHROME = process.env.CHROME || undefined;
const errores = [];
const ok = m => console.log("  ✓ " + m);

const PERFIL_INF = {
  id:"p1", key:"peque-inf", alias:"Peque", genero:"nina", curso:"inf5", nivel:3,
  cursoNombre:"3º Infantil", tema:"unicornios",
  modulos:["num","sub","sil","tra","ret","ami","pal"],
  juegos:["globos","mariposas","naves","plataformas","dibujar"]
};
const PERFIL_PRI = { ...PERFIL_INF, id:"p2", key:"peque-pri", alias:"Peque2", curso:"pri1",
  nivel:1, cursoNombre:"1º Primaria", tema:"princesas", modulos:["abn","igu","dif","mul"] };

const navegador = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const ctx = await navegador.newContext({ viewport:{ width:820, height:1180 }, hasTouch:true });
const pag = await ctx.newPage();
pag.on("pageerror", e => errores.push("ERROR JS · " + e.message));

/* ───── 1. anti-toqueteo (motor de infantil) ───── */
await pag.goto(BASE + "index.html");
await pag.evaluate(p => {
  localStorage.setItem("pm_perfiles", JSON.stringify([p]));
  localStorage.setItem("pm_perfilActivo", JSON.stringify(p));
  localStorage.setItem("pm_familia", JSON.stringify("PRUEBA-001"));
}, PERFIL_INF);
await pag.goto(BASE + "infantil.html");
await pag.waitForTimeout(500);
await pag.evaluate(() => { S.sonido = false; guardar(); });

console.log("Anti-toqueteo (infantil)…");
const congelado = await pag.evaluate(async () => {
  startTanda({ origen:"libre", titulo:"Prueba", ejercicios: genTanda(["num"], 2, 12), nivel:2 });
  await new Promise(r => setTimeout(r, 300));
  // hay que dar con una opción MALA; si se acierta de casualidad, al siguiente
  let opciones = [], idxAntes = -1;
  for (let intento = 0; intento < 12; intento++) {
    opciones = [...document.querySelectorAll(".opcion")];
    idxAntes = Tanda.idx;
    opciones[0].dispatchEvent(new PointerEvent("pointerdown", { bubbles:true }));
    await new Promise(r => setTimeout(r, 150));
    if (EjState.intentos > 0) break;              // fallado: es lo que buscábamos
    await new Promise(r => setTimeout(r, 2400));  // acertado: al siguiente
  }
  if (EjState.intentos === 0) return { saltado:"no hubo manera de fallar" };
  const intentosTrasFallo = EjState.intentos;
  opciones[1].dispatchEvent(new PointerEvent("pointerdown", { bubbles:true }));
  opciones[2] && opciones[2].dispatchEvent(new PointerEvent("pointerdown", { bubbles:true }));
  await new Promise(r => setTimeout(r, 150));
  const congeladaOk = EjState.intentos === intentosTrasFallo && Tanda.idx === idxAntes;
  await new Promise(r => setTimeout(r, 2100));    // y al rato tiene que soltarse
  return { congeladaOk, sigueCongelada: document.querySelector(".opciones").classList.contains("esperando") };
});
if (congelado.saltado) errores.push("anti-toqueteo: " + congelado.saltado);
else if (!congelado.congeladaOk) errores.push("anti-toqueteo: los toques siguen contando justo después de fallar");
else if (congelado.sigueCongelada) errores.push("anti-toqueteo: la rejilla se queda congelada para siempre");
else ok("tras un fallo la rejilla se congela ~2 s y luego se suelta");

/* ───── 2. repesca ───── */
console.log("Repesca (infantil)…");
const repesca = await pag.evaluate(async () => {
  startTanda({ origen:"libre", titulo:"Prueba", ejercicios: genTanda(["num"], 2, 12), nivel:2 });
  await new Promise(r => setTimeout(r, 250));
  for (let paso = 0; paso < 30 && Tanda && !Tanda.repesca.length; paso++) {
    const vivas = [...document.querySelectorAll(".opcion:not(.apagada):not(.bien)")];
    if (vivas.length) vivas[0].dispatchEvent(new PointerEvent("pointerdown", { bubbles:true }));
    await new Promise(r => setTimeout(r, 2400));
  }
  return {
    apuntadas: Tanda ? Tanda.repesca.length : 0,
    tipo: Tanda && Tanda.repesca[0] && Tanda.repesca[0].t,
    marcada: Tanda && Tanda.repesca[0] && Tanda.repesca[0].repesca === true
  };
});
if (!repesca.apuntadas) errores.push("repesca: se falló un ejercicio y no quedó apuntado para el repaso");
else if (!repesca.marcada) errores.push("repesca: el ejercicio de repaso no viene marcado, podría encadenar repescas sin fin");
else ok(`lo fallado queda apuntado para el final (tipo "${repesca.tipo}", marcado como repaso)`);

/* ───── 3. ajustes de perfil del portal ───── */
console.log("Ajustes de perfil (portal)…");
await pag.goto(BASE + "index.html");
await pag.waitForTimeout(300);
await pag.locator(".perfil-card .ajustes").first().click();
await pag.waitForTimeout(300);
if (!(await pag.locator("#s-ajustes.activa").count())) errores.push("ajustes: el engranaje de la tarjeta no abre la pantalla");
else ok("el engranaje de la tarjeta abre los ajustes del peque");

await pag.locator("#aj-modulos .mod-chip.sel").first().click();
await pag.locator("#aj-guardar").click();
await pag.waitForTimeout(300);
const guardado = await pag.evaluate(() => JSON.parse(localStorage.getItem("pm_perfiles"))[0].modulos);
if (guardado.length !== PERFIL_INF.modulos.length - 1) {
  errores.push(`ajustes: no guardó el cambio de módulos (${guardado.length} en vez de ${PERFIL_INF.modulos.length - 1})`);
} else ok("quitar un módulo se guarda en el perfil");

/* ───── 4. el alta premarca según el curso ───── */
console.log("Alta por curso (portal)…");
const premarcados = await pag.evaluate(() => {
  const salida = {};
  ["pri1", "pri3"].forEach(curso => {
    salida[curso] = MODULOS.primaria.filter(m => vieneMarcado(m, curso)).map(m => m.id);
  });
  salida.avisadosEn1 = MODULOS.primaria.filter(m => !tocaYa(m, "pri1")).map(m => m.id);
  return salida;
});
if (premarcados.pri1.includes("mul") || premarcados.pri1.includes("div")) {
  errores.push("alta: 1º de primaria sigue viniendo con multiplicación o división marcadas");
} else ok(`1º viene con [${premarcados.pri1}] y avisa de [${premarcados.avisadosEn1}]`);
if (!premarcados.pri3.includes("mul")) errores.push("alta: en 3º de primaria la multiplicación debería venir marcada");
else ok(`3º viene con [${premarcados.pri3}]`);

/* ───── 5. a un peque de 1º no le caen multiplicaciones de mayores ───── */
console.log("Nivel por curso (primaria)…");
await pag.evaluate(p => {
  localStorage.setItem("pm_perfiles", JSON.stringify([p]));
  localStorage.setItem("pm_perfilActivo", JSON.stringify(p));
}, PERFIL_PRI);
await pag.goto(BASE + "primaria.html");
await pag.waitForTimeout(500);
const mision = await pag.evaluate(() => {
  // en 1º solo caben tablas del 2, del 5 y del 10 (nivel 1 de genMul): ni
  // rejilla (nivel 3) ni multiplicación inversa (nivel 2)
  const malas = new Set();
  let cuantas = 0;
  for (let i = 0; i < 400; i++) genMisionDiaria().forEach(ej => {
    if (ej.t !== "mul") return;
    cuantas++;
    if (ej.d.sub !== "tabla") malas.add(ej.d.sub);
    else if (![ej.d.a, ej.d.b].some(v => [2, 5, 10].includes(v))) malas.add(`${ej.d.a}×${ej.d.b}`);
  });
  return { malas:[...malas], cuantas };
});
if (mision.malas.length) errores.push(`nivel por curso: a un peque de 1º le caen multiplicaciones de más (${mision.malas.join(", ")})`);
else ok(`${mision.cuantas} multiplicaciones generadas para 1º, todas de las tablas del 2, 5 y 10`);

await navegador.close();
if (errores.length) { console.log("\n✗ FALLOS:\n" + errores.map(e => "  · " + e).join("\n")); process.exit(1); }
console.log("\n✓ Anti-toqueteo, repesca, ajustes del portal y nivel por curso: comprobado en navegador");
