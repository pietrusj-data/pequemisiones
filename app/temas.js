"use strict";
/* ═══════════════════════════════════════════════════════════════
   PequeMisiones · Sistema de temas
   Cada tema define: paleta genérica, mascota (con frases), mundo,
   decoraciones flotantes y emojis para contar.
   Cualquier peque puede elegir cualquier tema; el género del perfil
   solo ajusta la gramática (bienvenido/a, campeón/campeona).
   ═══════════════════════════════════════════════════════════════ */
const TEMAS = {
  princesas: {
    id: "princesas", nombre: "Princesas", emoji: "👑",
    colores: {
      p1: "#ff7bac", p1osc: "#e2578f", p1suave: "#ffe3ef",   // principal
      p2: "#a78bfa", p2osc: "#8b6fe0", p2suave: "#f0e9ff",   // secundario
      p3: "#ffc94d", p3osc: "#e8a93e",                        // acento (oro)
      p4: "#5fe0c0", p4osc: "#3ec2a2", p4suave: "#e2fbf4",   // extra (menta)
      fondo: "linear-gradient(160deg,#ffe9f3 0%,#f3e8ff 55%,#e0f2fe 100%)",
      tinta: "#4b3b67", tintaSuave: "#8a7ba8"
    },
    mascota: { emoji: "🧚‍♀️", nombre: "Lila", presentacion: "el hada Lila" },
    mundo: { nombre: "castillo", emoji: "🏰", saludo: "¡El castillo te estaba esperando!" },
    decos: ["🏰","🦄","🌈","⭐","🧚‍♀️"],
    contar: [["👑","coronas"],["💎","gemas"],["🌸","flores"],["🦋","mariposas"],["⭐","estrellas"],["🍭","piruletas"]],
    moneda: { emoji: "💎", nombre: "gemas" }
  },
  unicornios: {
    id: "unicornios", nombre: "Unicornios", emoji: "🦄",
    colores: {
      p1: "#ff8fb8", p1osc: "#e2578f", p1suave: "#ffe3ef",
      p2: "#a78bfa", p2osc: "#8b6fe0", p2suave: "#f0e9ff",
      p3: "#ffc94d", p3osc: "#e8a93e",
      p4: "#7dd3fc", p4osc: "#4db8ef", p4suave: "#e3f5ff",
      fondo: "linear-gradient(175deg,#dff3ff 0%,#f3e8ff 50%,#ffeaf4 100%)",
      tinta: "#3d3660", tintaSuave: "#8a7ba8"
    },
    mascota: { emoji: "🦄", nombre: "Nube", presentacion: "la unicornia Nube" },
    mundo: { nombre: "mundo mágico", emoji: "🌈", saludo: "¡Tu mundo mágico te esperaba!" },
    decos: ["☁️","🌈","⭐","🦋","🦄"],
    contar: [["🦄","unicornios"],["🌈","arcoíris"],["⭐","estrellas"],["🦋","mariposas"],["🌸","flores"],["💖","corazones"]],
    moneda: { emoji: "⭐", nombre: "estrellas" }
  },
  espacio: {
    id: "espacio", nombre: "Espacio", emoji: "🚀",
    colores: {
      p1: "#7dd3fc", p1osc: "#38a8e8", p1suave: "#e0f4ff",
      p2: "#a78bfa", p2osc: "#8b6fe0", p2suave: "#efe9ff",
      p3: "#ffd166", p3osc: "#e0a92e",
      p4: "#6ee7c8", p4osc: "#3ec2a2", p4suave: "#e2fbf4",
      fondo: "linear-gradient(165deg,#dbeafe 0%,#e6e0ff 55%,#dff3ff 100%)",
      tinta: "#2e3a66", tintaSuave: "#7c86ad"
    },
    mascota: { emoji: "🤖", nombre: "Beep", presentacion: "el robot Beep" },
    mundo: { nombre: "nave", emoji: "🚀", saludo: "¡Tu nave está lista para despegar!" },
    decos: ["🚀","🪐","⭐","🛸","🌟"],
    contar: [["🚀","cohetes"],["🪐","planetas"],["⭐","estrellas"],["👽","marcianitos"],["🛸","platillos"],["☄️","cometas"]],
    moneda: { emoji: "🌟", nombre: "estrellas" }
  },
  dinos: {
    id: "dinos", nombre: "Dinosaurios", emoji: "🦖",
    colores: {
      p1: "#6ee7a8", p1osc: "#3ecb82", p1suave: "#e3fbef",
      p2: "#f0b968", p2osc: "#d69a3e", p2suave: "#fdf1dd",
      p3: "#ff8fb8", p3osc: "#e2578f",
      p4: "#7dd3fc", p4osc: "#4db8ef", p4suave: "#e3f5ff",
      fondo: "linear-gradient(165deg,#e6f9ee 0%,#fdf4e3 55%,#e3f5ff 100%)",
      tinta: "#3d5244", tintaSuave: "#7d967f"
    },
    mascota: { emoji: "🦖", nombre: "Rexi", presentacion: "el dino Rexi" },
    mundo: { nombre: "valle", emoji: "🌋", saludo: "¡El valle de los dinos te esperaba!" },
    decos: ["🦖","🦕","🌋","🍃","🥚"],
    contar: [["🦖","dinosaurios"],["🦕","cuellilargos"],["🥚","huevos"],["🍃","hojas"],["🐾","huellas"],["🌋","volcanes"]],
    moneda: { emoji: "🍖", nombre: "huesitos" }
  },
  mar: {
    id: "mar", nombre: "El mar", emoji: "🐬",
    colores: {
      p1: "#5fd4e8", p1osc: "#2fb4cc", p1suave: "#e0f8fd",
      p2: "#7d9cfa", p2osc: "#5f7ce0", p2suave: "#e9eeff",
      p3: "#ffd166", p3osc: "#e0a92e",
      p4: "#ff9ec2", p4osc: "#e2578f", p4suave: "#ffe9f2",
      fondo: "linear-gradient(170deg,#dff8ff 0%,#e6ecff 55%,#eafcf5 100%)",
      tinta: "#1e4b5e", tintaSuave: "#6a93a3"
    },
    mascota: { emoji: "🐬", nombre: "Burbujas", presentacion: "el delfín Burbujas" },
    mundo: { nombre: "océano", emoji: "🌊", saludo: "¡El océano te estaba esperando!" },
    decos: ["🐠","🐙","🌊","🐚","🫧"],
    contar: [["🐠","pececitos"],["🐙","pulpitos"],["🐚","conchas"],["⭐","estrellas de mar"],["🫧","burbujas"],["🦀","cangrejos"]],
    moneda: { emoji: "🐚", nombre: "conchas" }
  }
};

/* Aplica la paleta del tema sobre las variables CSS de cualquiera de los dos motores */
function aplicarTema(tema) {
  const c = tema.colores, r = document.documentElement.style;
  // variables del motor primaria (reino)
  r.setProperty("--rosa", c.p1); r.setProperty("--rosa-osc", c.p1osc); r.setProperty("--rosa-suave", c.p1suave);
  r.setProperty("--lila", c.p2); r.setProperty("--lila-osc", c.p2osc); r.setProperty("--lila-suave", c.p2suave);
  r.setProperty("--oro", c.p3); r.setProperty("--oro-osc", c.p3osc);
  r.setProperty("--menta", c.p4); r.setProperty("--menta-osc", c.p4osc); r.setProperty("--menta-suave", c.p4suave);
  r.setProperty("--cielo", c.p1); r.setProperty("--cielo-osc", c.p1osc);
  // variables del motor infantil (mundo)
  r.setProperty("--rojo", c.p1); r.setProperty("--azul", c.p1); r.setProperty("--azul-osc", c.p1osc);
  r.setProperty("--verde", c.p4); r.setProperty("--verde-osc", c.p4osc);
  r.setProperty("--tinta", c.tinta); r.setProperty("--tinta-suave", c.tintaSuave);
  document.body.style.background = c.fondo;
  // decoraciones flotantes
  document.querySelectorAll(".deco").forEach((d, i) => { d.textContent = tema.decos[i % tema.decos.length]; });
}

/* Concordancia de género: g === "a" para niña, "o" para niño */
function conc(perfil, femenino, masculino) {
  return perfil.genero === "nina" ? femenino : masculino;
}

/* Clave estable del peque, derivada de su nombre.
   Es lo que viaja al servidor junto al código de familia: así la MISMA tarjeta
   creada en otro dispositivo (el móvil de papá) apunta al mismo peque que la
   tablet del niño, sin cuentas ni datos personales. */
function clavePerfil(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "").slice(0, 24) || "peque";
}
/* Un perfil puede venir de antes de que existiera `key`: se recalcula del alias */
function keyDe(perfil) { return (perfil && perfil.key) || clavePerfil(perfil && perfil.alias); }
