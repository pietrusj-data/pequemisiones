import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Webhook de Stripe (PequeMisiones, plan Pro).
//
// Stripe llama aquí cuando pasa algo con un pago. Esta función verifica la
// FIRMA del aviso (nadie puede hacerse Pro mandando un POST inventado) y apunta
// el estado de la suscripción en pm_suscripciones, asociada al código de
// familia que viajó en el checkout (client_reference_id).
//
// Privacidad: del aviso de Stripe solo se guardan el código de familia, el
// estado, el plan y los identificadores de Stripe. El email del comprador se
// queda en Stripe: a nuestra base de datos no llega nunca.
//
// Secretos necesarios (Edge Functions → Secrets):
//   STRIPE_WEBHOOK_SECRET  el "signing secret" del endpoint (whsec_…)
//   STRIPE_SECRET_KEY      la clave secreta (sk_…), para leer la suscripción
//
// Eventos que hay que marcar en el endpoint de Stripe:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "https://tyoavvibplxkevxkamsb.supabase.co";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WH_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const VALIDO = /^[A-ZÑ]{2,12}(-[A-ZÑ0-9]{3,6}){1,3}$/; // mismo formato que acepta el portal

function sb(ruta: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${ruta}`, {
    ...init,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", ...(init.headers ?? {}),
    },
  });
}

/* Verificación de la firma de Stripe (HMAC-SHA256 de "t.payload"), sin SDK. */
async function firmaValida(payload: string, cabecera: string | null): Promise<boolean> {
  if (!cabecera || !WH_SECRET) return false;
  const t = /(?:^|,)t=(\d+)/.exec(cabecera)?.[1];
  const firmas = [...cabecera.matchAll(/(?:^|,)v1=([a-f0-9]+)/g)].map((m) => m[1]);
  if (!t || !firmas.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // aviso caducado o reloj raro
  const clave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(WH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(`${t}.${payload}`));
  const esperada = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // comparación en tiempo constante
  return firmas.some((f) => {
    if (f.length !== esperada.length) return false;
    let dif = 0;
    for (let i = 0; i < f.length; i++) dif |= f.charCodeAt(i) ^ esperada.charCodeAt(i);
    return dif === 0;
  });
}

/* Lee la suscripción en Stripe para sacar plan, periodo pagado y estado. */
async function leerSub(id: string) {
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (!r.ok) return null;
  const s = await r.json();
  const item = s.items?.data?.[0];
  const fin = item?.current_period_end ?? s.current_period_end; // según versión de la API viene en un sitio u otro
  return {
    estado: s.status === "active" || s.status === "trialing" ? "activa"
      : s.status === "canceled" ? "cancelada" : "impago",
    plan: item?.price?.recurring?.interval === "year" ? "anual" : "mensual",
    hasta: fin ? new Date(fin * 1000).toISOString() : null,
    customer: typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("solo POST", { status: 405 });
  if (!SERVICE || !WH_SECRET || !STRIPE_KEY) return new Response("función sin configurar", { status: 500 });

  const crudo = await req.text();
  if (!(await firmaValida(crudo, req.headers.get("stripe-signature")))) {
    return new Response("firma no válida", { status: 400 });
  }

  const evento = JSON.parse(crudo);
  const tipo = evento?.type ?? "";
  const obj = evento?.data?.object ?? {};

  if (tipo === "checkout.session.completed" && obj.mode === "subscription") {
    const familia = String(obj.client_reference_id ?? "").trim().toUpperCase();
    // Sin código de familia válido no hay a quién apuntar el pago. Se responde
    // 200 igualmente (reintentar no lo va a arreglar) y queda en el log.
    if (!VALIDO.test(familia)) { console.log("checkout sin familia válida:", obj.id); return new Response("ok"); }
    const sub = obj.subscription ? await leerSub(String(obj.subscription)) : null;
    const fila = {
      familia,
      estado: sub?.estado ?? "activa",
      plan: sub?.plan ?? null,
      hasta: sub?.hasta ?? null,
      stripe_customer: sub?.customer ?? (typeof obj.customer === "string" ? obj.customer : null),
      stripe_sub: obj.subscription ? String(obj.subscription) : null,
      updated_at: new Date().toISOString(),
    };
    const r = await sb("pm_suscripciones?on_conflict=familia", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(fila),
    });
    if (!r.ok) return new Response("no se pudo guardar", { status: 500 }); // Stripe reintenta solo
    return new Response("ok");
  }

  if (tipo === "customer.subscription.updated" || tipo === "customer.subscription.deleted") {
    const id = String(obj.id ?? "");
    if (!id) return new Response("ok");
    const item = obj.items?.data?.[0];
    const fin = item?.current_period_end ?? obj.current_period_end;
    const cambio = {
      estado: tipo.endsWith("deleted") || obj.status === "canceled" ? "cancelada"
        : obj.status === "active" || obj.status === "trialing" ? "activa" : "impago",
      plan: item?.price?.recurring?.interval === "year" ? "anual"
        : item?.price?.recurring?.interval === "month" ? "mensual" : undefined,
      hasta: fin ? new Date(fin * 1000).toISOString() : undefined,
      updated_at: new Date().toISOString(),
    };
    const r = await sb(`pm_suscripciones?stripe_sub=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(cambio),
    });
    if (!r.ok) return new Response("no se pudo actualizar", { status: 500 });
    return new Response("ok");
  }

  return new Response("ok"); // evento que no nos toca: recibido y en paz
});
