/*
 * Prueba de aislamiento entre familias — CONTRA LA BASE DE DATOS DE VERDAD.
 *
 * Es la promesa más seria del producto: los datos de un niño no los puede ver ni
 * tocar nadie más. Aquí se comprueba de la única forma que vale, haciendo las
 * mismas peticiones que haría un atacante con la clave pública (que va dentro de
 * cada index.html, así que cualquiera la tiene).
 *
 * La prueba crea una misión de mentira, intenta asaltarla desde otra familia y
 * después borra lo que ha creado. No toca ningún dato real.
 *
 *   node --test pruebas/aislamiento.test.js
 *
 * Si el proyecto de Supabase está pausado por inactividad, la prueba avisa y se
 * salta en vez de dar un falso fallo.
 */
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");

// OJO: no llamar URL a esta constante — pisaría el constructor global que usa fetch.
const SUPA = "https://tyoavvibplxkevxkamsb.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2F2dmlicGx4a2V2eGthbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDA4NTAsImV4cCI6MjA5MjQxNjg1MH0.x26xzz4nV3Umtj4_4SCPu9NXQRLDEh1xZeQgGk6adrQ";

// Dos familias inventadas para la prueba. El sufijo evita chocar con otra
// ejecución simultánea; nunca coinciden con un código real.
const sufijo = String(process.pid).slice(-4).padStart(4, "0");
const CASA_A = `PRUEBAA-${sufijo}`;
const CASA_B = `PRUEBAB-${sufijo}`;
const PERFIL = "peque-de-prueba";

function pide(ruta, { familia, metodo = "GET", cuerpo, prefer } = {}) {
  const cab = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };
  if (familia) cab["x-familia"] = familia;
  if (prefer) cab.Prefer = prefer;
  return fetch(`${SUPA}/rest/v1/${ruta}`, { method: metodo, headers: cab, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
}

const misionDePrueba = familia => ({
  familia, perfil: PERFIL,
  titulo: "Misión",           // título autogenerado → se aprueba sin llamar a la IA
  nivel: 1,
  ejercicios: [{ t: "abn", d: { op: "suma", a: 12, b: 5 } }],
});

describe("aislamiento entre familias", () => {
  let vivo = true;
  let idA = null;

  before(async () => {
    try {
      const r = await pide("pm_misiones?select=id&limit=1", { familia: CASA_A });
      if (r.status >= 500) vivo = false;
    } catch (_) { vivo = false; }
    if (!vivo) console.log("\n  ⚠️  No hay respuesta del servidor (¿proyecto de Supabase en pausa?): pruebas saltadas\n");
  });

  test("una familia puede crear su misión y verla", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const r = await pide("pm_misiones", { familia: CASA_A, metodo: "POST", cuerpo: misionDePrueba(CASA_A), prefer: "return=representation" });
    assert.equal(r.status, 201, `crear la misión propia debería funcionar (salió ${r.status})`);
    const fila = (await r.json())[0];
    idA = fila.id;
    assert.equal(fila.familia, CASA_A);
    assert.equal(fila.revision, "pendiente", "toda misión nace sin revisar: el niño no la ve hasta que se aprueba");

    const propia = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_A });
    assert.equal((await propia.json()).length, 1, "la familia no ve su propia misión");
  });

  test("otra familia NO ve esa misión", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const r = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_B });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), [], "¡FUGA! otra familia está viendo datos ajenos");
  });

  test("sin código de familia no se ve absolutamente nada", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    for (const tabla of ["pm_misiones", "pm_resultados", "pm_insignias", "pm_dudas"]) {
      const r = await pide(`${tabla}?limit=5`, {});
      const d = await r.json();
      assert.ok(Array.isArray(d) && d.length === 0, `¡FUGA! ${tabla} devuelve filas sin código de familia`);
    }
  });

  test("no se puede escribir en la familia de otro", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const r = await pide("pm_misiones", { familia: CASA_B, metodo: "POST", cuerpo: misionDePrueba(CASA_A) });
    assert.ok(r.status === 401 || r.status === 403,
      `colar una misión en otra familia debería dar 401/403 y dio ${r.status}`);
  });

  test("no se puede modificar ni borrar la misión de otro", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const patch = await pide(`pm_misiones?id=eq.${idA}`, {
      familia: CASA_B, metodo: "PATCH", cuerpo: { titulo: "asaltada" }, prefer: "return=representation",
    });
    assert.deepEqual(await patch.json(), [], "¡FUGA! se ha podido modificar una misión ajena");

    const del = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_B, metodo: "DELETE", prefer: "return=representation" });
    assert.deepEqual(await del.json(), [], "¡FUGA! se ha podido borrar una misión ajena");

    const sigue = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_A });
    const filas = await sigue.json();
    assert.equal(filas.length, 1, "la misión debería seguir ahí, intacta");
    assert.equal(filas[0].titulo, "Misión", "el título ha cambiado: alguien de fuera pudo escribir");
  });

  test("el cliente no puede aprobar su propio mensaje", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const r = await pide(`pm_misiones?id=eq.${idA}`, {
      familia: CASA_A, metodo: "PATCH",
      cuerpo: { revision: "aprobada", revision_motivo: "me apruebo yo" },
      prefer: "return=representation",
    });
    const fila = (await r.json())[0];
    assert.notEqual(fila.revision_motivo, "me apruebo yo",
      "¡GRAVE! un cliente ha podido fijar el veredicto de la moderación");
  });

  test("la lista de espera no se puede leer con la clave pública", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const r = await pide("pm_interesados?select=email&limit=5", { familia: CASA_A });
    if (r.status === 200) {
      assert.deepEqual(await r.json(), [], "¡FUGA DE EMAILS! la lista de espera es legible desde el cliente");
    } else {
      assert.ok(r.status === 401 || r.status === 403, `esperaba 401/403 y salió ${r.status}`);
    }
  });

  test("las pistas del ayudante solo las escribe el servidor", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const r = await pide("pm_dudas", {
      familia: CASA_A, metodo: "POST",
      cuerpo: { familia: CASA_A, perfil: PERFIL, tipo: "abn", pista: "pista falsa" },
    });
    assert.ok(r.status === 401 || r.status === 403,
      `un cliente no debería poder inventar pistas (salió ${r.status})`);
  });

  test("limpieza: la familia borra su propia misión", async t => {
    if (!vivo || !idA) return t.skip("servidor no disponible");
    // El borrado solo está permitido en misiones ya hechas (para que nadie le
    // quite a un peque una misión sin jugar), así que primero se marca hecha.
    await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_A, metodo: "PATCH", cuerpo: { estado: "hecha", hecha_at: new Date().toISOString() } });
    const del = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_A, metodo: "DELETE" });
    assert.ok(del.status === 204 || del.status === 200, `borrar la propia debería funcionar (salió ${del.status})`);

    const queda = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_A });
    assert.deepEqual(await queda.json(), [], "la misión de prueba no se ha borrado: limpiar a mano");
  });
});
