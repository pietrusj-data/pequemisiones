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
      // Un select con la clave anon y cabecera de familia jamás da 403 en el
      // Supabase real (RLS responde 200 con lista vacía). Un 403, un 5xx o una
      // respuesta que no es JSON significan proxy corporativo, red capada o
      // proyecto en pausa: nada que el aislamiento pueda juzgar.
      if (r.status >= 500 || r.status === 403) vivo = false;
      else await r.clone().json().catch(() => { vivo = false; });
    } catch (_) { vivo = false; }
    if (!vivo) console.log("\n  ⚠️  Sin camino limpio hasta el servidor (¿proyecto en pausa o red bloqueada?): pruebas saltadas\n");
  });

  test("una familia puede crear su misión y verla", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    const r = await pide("pm_misiones", { familia: CASA_A, metodo: "POST", cuerpo: misionDePrueba(CASA_A), prefer: "return=representation" });
    assert.equal(r.status, 201, `crear la misión propia debería funcionar (salió ${r.status})`);
    const fila = (await r.json())[0];
    idA = fila.id;
    assert.equal(fila.familia, CASA_A);
    // Desde 0014 esto lo decide la propia base de datos: sin mensaje y con
    // título autogenerado no hay nada que moderar, así que la misión sale
    // aprobada al instante — y llega al niño aunque la función `moderar` esté
    // caída o a medio desplegar. Es lo que queremos: la IA solo se paga (y solo
    // hace esperar) cuando hay texto libre de verdad.
    assert.equal(fila.revision, "aprobada", "una misión sin texto libre debería fluir sola");
    assert.equal(fila.revision_motivo, "sin_texto", "y constar por qué se aprobó sin pasar por la IA");

    const propia = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_A });
    assert.equal((await propia.json()).length, 1, "la familia no ve su propia misión");
  });

  test("una misión CON mensaje nace pendiente y el niño no la ve", async t => {
    if (!vivo) return t.skip("servidor no disponible");
    // La otra mitad de la regla, y la que de verdad protege a la niña: en cuanto
    // hay texto libre del adulto, la misión nace sin aprobar y es INVISIBLE para
    // la clave pública hasta que la moderación la apruebe. Se comprueba contra
    // mates_misiones porque es donde juega Paula y donde 0013 puso la regla en
    // la propia base de datos (`select` filtra por revision='aprobada'), no en
    // la app. Fail-closed: si `moderar` está caída, la niña no ve nada — que es
    // mejor que oír lo que no debe.
    const marca = `·prueba-aislamiento-${sufijo}·`;
    // Sin `return=representation` a propósito: con RETURNING, PostgreSQL exige
    // que la política de lectura permita ver la fila recién creada, así que la
    // creación entera se cae con un 401. Eso también demuestra que la misión
    // está escondida, pero por un camino demasiado sutil para dejarlo escrito
    // como la aserción de esta prueba (y le enseñaría al futuro lector el
    // error equivocado). Se crea a ciegas y se comprueba leyendo después.
    const r = await pide("mates_misiones", {
      familia: CASA_A, metodo: "POST",
      cuerpo: { titulo: "Título escrito a mano", mensaje: marca, nivel: 1, ejercicios: [{ t: "abn", d: { op: "suma", a: 3, b: 4 } }] },
    });
    assert.equal(r.status, 201, `crear la misión con mensaje debería funcionar (salió ${r.status})`);

    const busca = await pide(`mates_misiones?mensaje=eq.${encodeURIComponent(marca)}`, { familia: CASA_A });
    assert.deepEqual(await busca.json(), [],
      "¡GRAVE! una misión con mensaje sin moderar se puede leer con la clave pública");

    // Limpieza: el borrado no pasa por la política de lectura, así que se puede
    // quitar aunque no se vea. (Si esto fallara, quedaría una fila invisible:
    // la recoge el barrido de borrado por plazos de 0007.)
    const del = await pide(`mates_misiones?mensaje=eq.${encodeURIComponent(marca)}`, { familia: CASA_A, metodo: "DELETE" });
    assert.ok(del.status === 204 || del.status === 200, `no se pudo limpiar la misión de prueba (salió ${del.status})`);
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

  test("rotar el código mueve el historial (y nadie puede rotar sin código fuerte)", async t => {
    if (!vivo || !idA) return t.skip("servidor no disponible");
    // La función `rotar` puede no estar desplegada todavía: en ese caso se
    // avisa y se salta, igual que cuando el proyecto está en pausa.
    const rota = (viejo, nuevo) => fetch(`${SUPA}/functions/v1/rotar`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", "x-familia": viejo },
      body: JSON.stringify({ nuevo }),
    });

    const NUEVA = `LUNA-QQ${sufijo.slice(0, 2)}-WW${sufijo.slice(2)}`.toUpperCase()
      .replace(/[O0IL1UV]/g, "7"); // por si el pid trae caracteres fuera del alfabeto
    let r;
    try { r = await rota(CASA_A, NUEVA); } catch (_) { return t.skip("sin red hacia la función"); }
    if (r.status === 404) return t.skip("la función `rotar` no está desplegada aún");

    assert.ok(r.ok, `rotar con el código propio debería funcionar (salió ${r.status})`);

    // el historial se ha movido: con el código viejo ya no se ve nada…
    const conViejo = await pide(`pm_misiones?id=eq.${idA}`, { familia: CASA_A });
    assert.deepEqual(await conViejo.json(), [], "tras rotar, el código viejo sigue viendo el historial");
    // …y con el nuevo se ve todo
    const conNuevo = await pide(`pm_misiones?id=eq.${idA}`, { familia: NUEVA });
    assert.equal((await conNuevo.json()).length, 1, "tras rotar, el código nuevo no ve el historial");

    // un código nuevo débil o mal formado se rechaza
    const mal = await rota(NUEVA, "SOL-123");
    assert.equal(mal.status, 400, "la función aceptó un código nuevo débil");

    // deshacer: se rota de vuelta para que la limpieza del final funcione
    const vuelta = await rota(NUEVA, null);
    assert.equal(vuelta.status, 400, "la función aceptó rotar hacia un código nulo");
    const deshacer = await fetch(`${SUPA}/functions/v1/rotar`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", "x-familia": NUEVA },
      body: JSON.stringify({ nuevo: CASA_A }),
    });
    // CASA_A (PRUEBAA-1234) no es formato fuerte, así que la vuelta directa se
    // rechaza: se borra aquí mismo con el código nuevo y se avisa a la limpieza.
    if (deshacer.status === 400) {
      await pide(`pm_misiones?id=eq.${idA}`, { familia: NUEVA, metodo: "PATCH", cuerpo: { estado: "hecha", hecha_at: new Date().toISOString() } });
      const del = await pide(`pm_misiones?id=eq.${idA}`, { familia: NUEVA, metodo: "DELETE" });
      assert.ok(del.status === 204 || del.status === 200, `no se pudo limpiar la misión rotada (salió ${del.status})`);
      idA = null; // la limpieza final ya no tiene nada que borrar
    }
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
