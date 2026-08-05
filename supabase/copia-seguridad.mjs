/*
 * Copia de seguridad de los datos de PequeMisiones.
 *
 * El plan gratuito de Supabase NO garantiza copias automáticas recuperables por
 * ti: eso es del plan de pago. Así que hasta que haya clientes, la copia se hace
 * con esto, a mano, y se guarda donde tú decidas.
 *
 * USO (PowerShell):
 *   $env:SUPABASE_SERVICE_KEY = "la-clave-de-servicio"
 *   node supabase/copia-seguridad.mjs
 *
 * La clave de servicio se saca del panel: Project Settings → API → service_role.
 * NUNCA se escribe en un archivo del repositorio: se pasa por variable de entorno
 * y se olvida al cerrar la ventana.
 *
 * Deja un archivo copia-AAAA-MM-DD.json en la carpeta `copias/` (que está
 * ignorada por git: los datos no se suben a ningún repositorio).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SB = "https://tyoavvibplxkevxkamsb.supabase.co";
const CLAVE = process.env.SUPABASE_SERVICE_KEY;

const TABLAS = [
  "pm_misiones", "pm_resultados", "pm_insignias", "pm_dudas",
  "pm_premios", "pm_canjes", "pm_reportes", "pm_interesados",
  "mates_misiones", "mates_resultados", "mates_insignias",
  "jim_misiones", "jim_resultados", "jim_insignias",
];

if (!CLAVE) {
  console.error("\n  Falta la clave de servicio.\n");
  console.error('  PowerShell:  $env:SUPABASE_SERVICE_KEY = "..."');
  console.error("  y vuelve a lanzar:  node supabase/copia-seguridad.mjs\n");
  process.exit(1);
}

async function trae(tabla) {
  const filas = [];
  let desde = 0;
  const paso = 1000;
  for (;;) {
    const r = await fetch(`${SB}/rest/v1/${tabla}?select=*&order=created_at.asc&limit=${paso}&offset=${desde}`, {
      headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
    });
    if (!r.ok) throw new Error(`${tabla}: ${r.status} ${(await r.text()).slice(0, 120)}`);
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < paso) break;
    desde += paso;
  }
  return filas;
}

const fecha = new Date().toISOString().slice(0, 10);
const copia = { hecha: new Date().toISOString(), proyecto: "tyoavvibplxkevxkamsb", tablas: {} };
let total = 0;

for (const t of TABLAS) {
  try {
    const filas = await trae(t);
    copia.tablas[t] = filas;
    total += filas.length;
    console.log(`  ${t.padEnd(18)} ${String(filas.length).padStart(6)} filas`);
  } catch (e) {
    console.log(`  ${t.padEnd(18)}      — ${e.message}`);
    copia.tablas[t] = { error: e.message };
  }
}

mkdirSync(join(process.cwd(), "copias"), { recursive: true });
const destino = join(process.cwd(), "copias", `copia-${fecha}.json`);
writeFileSync(destino, JSON.stringify(copia, null, 1), "utf8");

console.log(`\n  ✔ ${total} filas guardadas en ${destino}`);
console.log("  Guarda ese archivo fuera del ordenador (disco externo o nube personal).\n");
