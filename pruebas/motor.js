/*
 * Carga los generadores de un motor SIN abrir un navegador.
 *
 * Los motores son un único index.html con todo el JavaScript dentro, y al cargarse
 * tocan el DOM, la voz y la red. Aquí no hace falta nada de eso: se recortan del
 * archivo SOLO las funciones que generan ejercicios (que son puras: entran un nivel
 * y unos dados, sale un ejercicio) y se evalúan sueltas.
 *
 * Así los tests corren en menos de un segundo y prueban EL MISMO código que juega
 * el peque, no una copia.
 */
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

/* Recorta una declaración de nivel superior (`function X(){...}`, `const X = ...;`
   o `let X = ...;`) contando llaves, corchetes y paréntesis, y saltándose textos
   y comentarios. */
function recorta(src, nombre) {
  const re = new RegExp(`^(?:function\\s+${nombre}\\s*\\(|(?:const|let)\\s+${nombre}\\s*=)`, "m");
  const m = re.exec(src);
  if (!m) throw new Error(`No encuentro la declaración de "${nombre}" en el motor`);

  const esFuncion = m[0].startsWith("function");
  // En una función, los paréntesis de la firma no cuentan: se empieza a contar
  // en la primera llave, que es donde abre el cuerpo de verdad.
  let i = m.index, prof = 0, enCuerpo = !esFuncion;
  let texto = null, escape = false, comentario = null;

  for (; i < src.length; i++) {
    const c = src[i], sig = src[i + 1];

    if (comentario === "linea") { if (c === "\n") comentario = null; continue; }
    if (comentario === "bloque") { if (c === "*" && sig === "/") { comentario = null; i++; } continue; }
    if (texto) {
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === texto) texto = null;
      continue;
    }
    if (c === "/" && sig === "/") { comentario = "linea"; i++; continue; }
    if (c === "/" && sig === "*") { comentario = "bloque"; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { texto = c; continue; }

    if (!enCuerpo) { if (c === "{") { enCuerpo = true; prof = 1; } continue; }

    if (c === "{" || c === "[" || c === "(") { prof++; continue; }
    if (c === "}" || c === "]" || c === ")") {
      prof--;
      if (esFuncion && prof === 0) return src.slice(m.index, i + 1);
      continue;
    }
    if (!esFuncion && c === ";" && prof === 0) return src.slice(m.index, i + 1);
  }
  throw new Error(`La declaración de "${nombre}" no cierra bien`);
}

function jsDelMotor(rutaHtml) {
  const html = fs.readFileSync(rutaHtml, "utf8");
  const bloques = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  return bloques.map(b => b[1]).join("\n;\n");
}

/* Lo que cada motor necesita del mundo exterior, en versión de mentira:
   el tema visual (de temas.js), el perfil elegido y la maestría acumulada.
   `nivel` es el del curso del peque (1º de primaria = 1), del que cuelga el nivel
   de la misión del día: por eso se puede elegir desde la prueba. */
const ENTORNO = `
const TEMA = { contar: [["🍎","manzanas"],["⭐","estrellas"],["🐟","peces"],["🌸","flores"]] };
const PERFIL = { alias:"Peque", modulos:MODULOS_PRUEBA, juegos:[], nivel:NIVEL_PRUEBA };
const S = { chispa: {}, nivelLibre: NIVEL_PRUEBA };
/* localStorage de mentira: la bolsa anti-repetición cree que siempre está vacía */
const LS = { get(k, def){ return def; }, set(){} };
`;

const MOTORES = {
  primaria: {
    archivo: "app/primaria.html",
    modulos: ["abn", "cla", "igu", "dif", "mul", "div", "rel", "pes", "geo", "cie", "ing"],
    piezas: [
      "ri", "llevaSuma", "llevaResta", "conProb", "mayorPrimero", "barajar", "cap1",
      "Bolsas", "sacarDeBolsa",
      "PERSONAJES", "ITEMS", "HORAS_TXT", "fmtHM", "horaEnPalabras",
      "nombreP", "fraseIgu", "relObjetivo", "pesoEnTexto", "pesTotal",
      "difDec", "difFmt", "difHabla", "GRAMOS",
      "MAPA_ES", "MAPA_MU", "TOPE_GEO", "piezasMapa", "piezaGeo", "piezasGeo",
      "conArtGeo", "opcionesGeo",
      "LAMINAS", "CICLOS", "CESTAS", "laminaDe", "partesLam", "parteLam", "conArtCie",
      "genSenala", "genOrdena", "genClasifica", "genCie",
      "VOCAB_ING", "NUM_ING", "vocabIng", "pluralIng", "fraseIng", "distractoresIng", "genIng",
      "genAbn", "genCla", "genIgu", "genDif", "genRel", "genPes", "genMul", "genDiv", "genGeo",
      "GEN", "genMisionDiaria", "genTanda",
    ],
  },
  infantil: {
    archivo: "app/infantil.html",
    modulos: ["num", "sub", "pal", "ret", "ami", "vec", "fam", "sil", "tra", "cyd", "ing"],
    piezas: [
      "ri", "conProb", "barajar", "VOCALES", "CONS_NIVEL", "NOMBRE_LETRA",
      "PALABRAS", "silabasDe", "distractores", "EMOJIS_CONTAR", "retRecientes",
      "PALABRAS_CUENTA", "palabraCuenta",
      "CUENTOS_SIL", "cuentoUltimo", "genCuentoSil", "genComplSil",
      "VOCAB_ING_INF", "NUM_EN_INF", "vocabIngInf", "genIng",
      "genNum", "genAmi", "genVec", "genSil", "genTra", "genFam", "genSub", "genPal", "genRet", "genCyd",
      "GEN", "genMisionDiaria", "genTanda",
    ],
  },
};

function cargaMotor(cual, { nivel = 2, modulos } = {}) {
  const cfg = MOTORES[cual];
  if (!cfg) throw new Error(`Motor desconocido: ${cual}`);
  const src = jsDelMotor(path.join(RAIZ, cfg.archivo));
  const recortes = cfg.piezas.map(p => recorta(src, p)).join("\n");
  const devuelve = `return { ${cfg.piezas.join(", ")} };`;
  const fabrica = new Function("MODULOS_PRUEBA", "NIVEL_PRUEBA", ENTORNO + recortes + "\n" + devuelve);
  return fabrica(modulos || cfg.modulos, nivel);
}

module.exports = { cargaMotor, MOTORES, recorta, jsDelMotor };
