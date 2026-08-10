/*
 * La llave de la familia, probada en un navegador de verdad:
 *
 *   · un portal recién estrenado genera un código FUERTE (no de la primera época);
 *   · el enlace ?vincular=... une el dispositivo a la familia previa confirmación,
 *     y el código no se queda en la barra de direcciones;
 *   · si el usuario dice que no, no se toca nada;
 *   · un código débil guardado hace aparecer el aviso de "reforzar"; uno fuerte, no.
 *
 * (La rotación en el servidor no se puede probar aquí: vive en la edge function
 * `rotar` y se comprueba contra el Supabase real en pruebas/aislamiento.test.js.)
 *
 *   python -m http.server 8796          (en la raíz del repo)
 *   node pruebas/navegador/vinculo.mjs
 */
const { chromium } = await import(process.env.PW || "playwright");

const BASE = (process.env.BASE || "http://127.0.0.1:8796") + "/app/";
const CHROME = process.env.CHROME || undefined;
const errores = [];
const ok = m => console.log("  ✓ " + m);
const FUERTE = /^[A-ZÑ]{2,12}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

const navegador = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const ctx = await navegador.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
const pag = await ctx.newPage();
pag.on("pageerror", e => errores.push("ERROR JS · " + e.message));

// diálogos: se controla desde cada paso si se acepta o se rechaza
let aceptar = true;
const dialogos = [];
pag.on("dialog", d => { dialogos.push(d.message()); (aceptar ? d.accept() : d.dismiss()); });

console.log("Código de estreno…");
await pag.goto(BASE + "index.html");
await pag.evaluate(() => localStorage.clear());
await pag.goto(BASE + "index.html");
await pag.waitForTimeout(300);
const cod = await pag.evaluate(() => codigoFamilia());
if (!FUERTE.test(cod)) errores.push(`un portal nuevo generó un código débil o raro: ${cod}`);
else ok(`el primer código ya nace fuerte: ${cod}`);

console.log("Enlace de vinculación…");
aceptar = true;
await pag.goto(BASE + "index.html?vincular=luna-abcd-efgh"); // en minúsculas a propósito: se normaliza
await pag.waitForTimeout(400);
const tras = await pag.evaluate(() => ({
  familia: JSON.parse(localStorage.getItem("pm_familia")),
  url: location.search
}));
if (tras.familia !== "LUNA-ABCD-EFGH") errores.push(`el enlace no vinculó (familia = ${tras.familia})`);
else ok("abrir el enlace une el dispositivo a la familia (y normaliza mayúsculas)");
if (tras.url !== "") errores.push(`el código se quedó en la barra de direcciones: ${tras.url}`);
else ok("el código no se queda en la URL ni en el historial del navegador");

console.log("Decir que no…");
aceptar = false;
await pag.goto(BASE + "index.html?vincular=SOL-QQQQ-WWWW");
await pag.waitForTimeout(400);
const negado = await pag.evaluate(() => JSON.parse(localStorage.getItem("pm_familia")));
if (negado !== "LUNA-ABCD-EFGH") errores.push(`se vinculó sin permiso (familia = ${negado})`);
else ok("si el adulto rechaza la confirmación, no se toca nada");
aceptar = true;

console.log("Enlace con basura…");
await pag.goto(BASE + "index.html?vincular=" + encodeURIComponent("'; drop --"));
await pag.waitForTimeout(400);
const basura = await pag.evaluate(() => JSON.parse(localStorage.getItem("pm_familia")));
if (basura !== "LUNA-ABCD-EFGH") errores.push(`un enlace con basura cambió la familia a: ${basura}`);
else ok("un enlace con un código inválido se ignora");

console.log("Aviso de código débil…");
await pag.evaluate(() => localStorage.setItem("pm_familia", JSON.stringify("LUNA-847")));
await pag.goto(BASE + "index.html");
await pag.waitForTimeout(300);
const avisoDebil = await pag.evaluate(() => document.getElementById("aviso-codigo").style.display !== "none");
if (!avisoDebil) errores.push("con un código de la primera época no aparece el aviso de reforzar");
else ok("un código de la primera época enciende el aviso de «reforzar»");

await pag.evaluate(() => localStorage.setItem("pm_familia", JSON.stringify("LUNA-ABCD-EFGH")));
await pag.goto(BASE + "index.html");
await pag.waitForTimeout(300);
const avisoFuerte = await pag.evaluate(() => document.getElementById("aviso-codigo").style.display !== "none");
if (avisoFuerte) errores.push("el aviso de reforzar sale también con códigos fuertes");
else ok("con un código fuerte el aviso no molesta");

const hayBoton = await pag.locator("#btn-vincular").count();
if (!hayBoton) errores.push("no existe el botón de vincular otro dispositivo");
else ok("el botón 📲 Vincular otro dispositivo está en el portal");

await navegador.close();
if (errores.length) { console.log("\n✗ FALLOS:\n" + errores.map(e => "  · " + e).join("\n")); process.exit(1); }
console.log("\n✓ La llave de familia: generación fuerte, vinculación por enlace y aviso de refuerzo, comprobados");
