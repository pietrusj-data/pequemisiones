/* ═══════════════════════════════════════════════════════════════════
   VIGÍA — avisar cuando algo se rompe en el dispositivo de una familia
   ═══════════════════════════════════════════════════════════════════
   Hasta ahora, si a un peque se le quedaba la pantalla en blanco, nadie se
   enteraba salvo que el adulto lo contase. Esto lo arregla con lo mínimo:
   sin librerías, sin cookies y sin rastrear a nadie.

   QUÉ SE ENVÍA: el mensaje del error, dónde ocurrió, qué motor y qué navegador.
   QUÉ NO SE ENVÍA, A PROPÓSITO: ni código de familia, ni perfil, ni alias, ni
   nada que permita saber a quién le pasó. Un error no justifica saltarse el
   principio de la casa.

   La tabla solo admite escritura: cualquiera puede avisar de un error, nadie
   puede leer los de nadie. Se miran desde el panel de Supabase.
*/
(function(){
  "use strict";
  const SB   = "https://tyoavvibplxkevxkamsb.supabase.co";
  const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2F2dmlicGx4a2V2eGthbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDA4NTAsImV4cCI6MjA5MjQxNjg1MH0.x26xzz4nV3Umtj4_4SCPu9NXQRLDEh1xZeQgGk6adrQ";
  const MOTOR = document.documentElement.getAttribute("data-motor") || "?";
  const VERSION = document.documentElement.getAttribute("data-version") || "";

  const MAX_POR_SESION = 5;      // un fallo en bucle no debe convertirse en una inundación
  let enviados = 0;
  const yaVistos = new Set();

  /* Navegador y sistema, sin la retahíla entera del user-agent (que es casi una huella). */
  function agente(){
    const ua = navigator.userAgent;
    const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera"
              : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox"
              : /Safari\//.test(ua) ? "Safari" : "otro";
    const so  = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS"
              : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac"
              : /Linux/.test(ua) ? "Linux" : "otro";
    return nav + " · " + so + " · " + (window.innerWidth < 768 ? "móvil" : "pantalla grande");
  }

  function pantallaActiva(){
    const s = document.querySelector(".screen.activa, .pantalla.activa");
    return s ? s.id : "";
  }

  function avisa(mensaje, origen){
    try{
      mensaje = String(mensaje || "").slice(0, 400);
      if(!mensaje) return;
      const clave = mensaje + "|" + origen;
      if(yaVistos.has(clave) || enviados >= MAX_POR_SESION) return;
      yaVistos.add(clave); enviados++;
      fetch(SB + "/rest/v1/pm_errores", {
        method: "POST",
        headers: { apikey: ANON, Authorization: "Bearer " + ANON,
                   "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ motor: MOTOR, pantalla: pantallaActiva(), mensaje,
                               origen: String(origen || "").slice(0, 200),
                               agente: agente(), version: VERSION }),
        keepalive: true   // que salga aunque la pestaña se esté cerrando
      }).catch(function(){ /* si ni esto sale, no hay nada que hacer */ });
    }catch(e){ /* el vigía jamás puede ser el que rompa la app */ }
  }

  window.addEventListener("error", function(e){
    if(e && e.message) avisa(e.message, (e.filename||"") + ":" + (e.lineno||0) + ":" + (e.colno||0));
  });
  window.addEventListener("unhandledrejection", function(e){
    const r = e && e.reason;
    avisa("promesa sin capturar: " + (r && r.message ? r.message : r), "");
  });

  // Por si hace falta avisar de algo a mano desde el código de la app
  window.PM_AVISA = avisa;
})();
