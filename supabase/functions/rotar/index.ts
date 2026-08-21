import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Rotación del código de familia (PequeMisiones).
//
// El código de familia ES la llave de los datos: las políticas RLS comparan
// contra él. Los códigos de la primera época (LUNA-847) solo tenían 18.000
// combinaciones posibles y se podían adivinar barriendo, así que el portal
// ofrece "reforzar": esta función mueve TODO el historial de la familia al
// código nuevo, de un tirón y con service_role (el cliente no puede, porque
// las políticas le impiden escribir filas de una familia que no es la suya).
//
// Quién puede llamarla: quien tenga el código actual — que ya lo puede leer y
// tocar todo, así que rotar no le da ningún poder nuevo. El riesgo real es un
// secuestro (alguien barre códigos débiles ajenos y los rota para dejar fuera a
// la familia): por eso cada rotación queda apuntada en pm_rotaciones con el
// viejo y el nuevo, de modo que desde el panel se puede DESHACER cualquier
// rotación llamando otra vez con los códigos al revés; y hay límites de ritmo
// que hacen inviable un barrido masivo.
//
// Si algo falla a mitad (una tabla movida y otra no), reintentar con la misma
// pareja viejo→nuevo termina el trabajo: el filtro familia=eq.viejo solo
// encuentra lo que queda por mover.

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "https://tyoavvibplxkevxkamsb.supabase.co";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Todas las tablas que llevan columna `familia` (pm_errores no la lleva, a propósito).
// pm_suscripciones incluida: reforzar el código no puede dejar a nadie sin su plan Pro.
// pm_cuentas, pm_dispositivos y pm_vinculos (0016-0017): rotar el código no cambia
// quién es el dueño ni desempareja ningún aparato.
const TABLAS = ["pm_misiones", "pm_resultados", "pm_insignias", "pm_dudas", "pm_reportes", "pm_premios", "pm_canjes", "pm_suscripciones", "pm_cuentas", "pm_dispositivos", "pm_vinculos"];

const FUERTE = /^[A-ZÑ]{2,12}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;    // formato de los códigos nuevos
const VALIDO = /^[A-ZÑ]{2,12}(-[A-ZÑ0-9]{3,6}){1,3}$/;      // cualquier código aceptado por el portal

const LIMITE_FAMILIA_DIA = 3;   // equivocarse y repetir, sí; darle al botón en bucle, no
const LIMITE_GLOBAL_DIA = 40;   // un barrido de secuestro necesita miles: se estrella aquí

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-familia",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

function sb(ruta: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${ruta}`, {
    ...init,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", ...(init.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "solo POST" }, 405);
  if (!SERVICE) return json({ error: "función sin configurar" }, 500);

  const viejo = (req.headers.get("x-familia") ?? "").trim().toUpperCase();
  const cuerpo = await req.json().catch(() => ({}));
  const nuevo = String(cuerpo?.nuevo ?? "").trim().toUpperCase();

  if (!VALIDO.test(viejo)) return json({ error: "código actual no válido" }, 400);
  if (!FUERTE.test(nuevo)) return json({ error: "el código nuevo debe ser del formato fuerte" }, 400);
  if (nuevo === viejo) return json({ error: "el código nuevo es el mismo" }, 400);

  // límites de ritmo (desde la tabla de auditoría)
  const hoy = new Date().toISOString().slice(0, 10);
  const rGlobal = await sb(`pm_rotaciones?select=id&created_at=gte.${hoy}&limit=${LIMITE_GLOBAL_DIA}`);
  const global = rGlobal.ok ? (await rGlobal.json()).length : LIMITE_GLOBAL_DIA;
  if (global >= LIMITE_GLOBAL_DIA) return json({ error: "hoy ya no se pueden cambiar más códigos, inténtalo mañana" }, 429);
  const rFam = await sb(`pm_rotaciones?select=id&viejo=eq.${encodeURIComponent(viejo)}&created_at=gte.${hoy}&limit=${LIMITE_FAMILIA_DIA}`);
  const fam = rFam.ok ? (await rFam.json()).length : LIMITE_FAMILIA_DIA;
  if (fam >= LIMITE_FAMILIA_DIA) return json({ error: "demasiados cambios hoy para esta familia" }, 429);

  // el código nuevo no puede estar ya en uso: chocaría con otra familia
  for (const t of TABLAS) {
    const r = await sb(`${t}?select=familia&familia=eq.${encodeURIComponent(nuevo)}&limit=1`);
    if (!r.ok) return json({ error: `no se pudo comprobar ${t}` }, 502);
    if ((await r.json()).length) return json({ error: "ese código ya está en uso, genera otro" }, 409);
  }

  // apuntar ANTES de mover: si algo falla a mitad, el rastro permite terminar o deshacer
  const rAud = await sb("pm_rotaciones", { method: "POST", body: JSON.stringify({ viejo, nuevo }) });
  if (!rAud.ok) return json({ error: "no se pudo registrar el cambio" }, 502);

  // mover el historial, tabla a tabla
  const movidas: Record<string, number> = {};
  for (const t of TABLAS) {
    const r = await sb(`${t}?familia=eq.${encodeURIComponent(viejo)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ familia: nuevo }),
    });
    if (!r.ok) return json({ error: `fallo moviendo ${t}: reintenta con el mismo código nuevo`, movidas }, 502);
    movidas[t] = (await r.json()).length;
  }

  return json({ ok: true, movidas });
});
