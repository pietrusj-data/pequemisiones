/*
 * Pruebas de los generadores de ejercicios.
 *
 * No comprueban "que salga tal número": los ejercicios son aleatorios a propósito.
 * Comprueban las REGLAS que nunca se pueden romper, porque romperlas significa que
 * un niño de verdad se queda delante de un ejercicio imposible:
 *
 *   · la respuesta correcta SIEMPRE está entre las opciones que se le ofrecen
 *   · no hay dos opciones iguales (dos botones buenos confunden)
 *   · convención ABN: el número mayor a la izquierda
 *   · ninguna resta da negativo, ninguna división pide algo imposible
 *   · los niveles no se salen de su rango
 *
 * Cada generador se ejecuta cientos de veces, así que los casos raros que solo
 * salen 1 de cada 200 tiradas también quedan cubiertos.
 */
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { cargaMotor } = require("./motor.js");

const VUELTAS = 400;

/* Repite un generador muchas veces y devuelve todo lo que salió. */
function muchas(fn, nivel, n = VUELTAS) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(fn(nivel));
  return out;
}
const entero = v => Number.isInteger(v);

/* La regla de oro: la respuesta buena está, y está una sola vez. */
function opcionesSanas(ops, correcta, contexto) {
  assert.ok(Array.isArray(ops) && ops.length >= 2, `${contexto}: hacen falta al menos 2 opciones`);
  assert.ok(ops.includes(correcta), `${contexto}: la respuesta correcta (${correcta}) NO está entre las opciones [${ops}]`);
  assert.equal(new Set(ops).size, ops.length, `${contexto}: hay opciones repetidas [${ops}]`);
}

describe("motor de primaria", () => {
  const M = cargaMotor("primaria");

  test("genAbn · el mayor a la izquierda y ninguna resta negativa", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genAbn, nivel)) {
        const d = ej.d;
        assert.equal(ej.t, "abn");
        assert.ok([d.a, d.b].every(entero), `nivel ${nivel}: números no enteros`);
        if (d.op === "suma") assert.ok(d.a >= d.b, `suma ${d.a}+${d.b}: el mayor debe ir primero`);
        if (d.op === "resta") assert.ok(d.a - d.b > 0, `resta ${d.a}-${d.b}: no puede dar 0 ni negativo`);
        if (d.op === "doble") assert.ok(d.a >= d.b && d.b >= d.c, `doble suma ${d.a}+${d.b}+${d.c}: orden descendente`);
        if (d.op === "sumirresta") {
          assert.ok(d.a >= d.b, `sumirresta ${d.a}+${d.b}-${d.c}: el mayor primero`);
          assert.ok(d.a + d.b - d.c > 0, `sumirresta ${d.a}+${d.b}-${d.c}: el resultado no puede ser negativo`);
        }
      }
    }
  });

  test("genAbn · el nivel 1 no se sale de dos cifras", () => {
    for (const ej of muchas(M.genAbn, 1)) {
      const d = ej.d;
      const max = d.op === "suma" ? d.a + d.b : d.a;
      assert.ok(max < 100, `nivel 1 debería quedarse en dos cifras y salió ${max}`);
    }
  });

  test("genCla · sumas y restas coherentes", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genCla, nivel)) {
        const d = ej.d;
        assert.equal(ej.t, "cla");
        if (d.op === "resta") assert.ok(d.a - d.b > 0, `resta clásica ${d.a}-${d.b} negativa`);
        if (d.op === "suma") assert.ok(d.a >= d.b, `suma clásica ${d.a}+${d.b}: mayor primero`);
        if (d.op === "suma3") assert.ok(d.a >= d.b && d.b >= d.c, "tres sumandos sin ordenar");
      }
    }
  });

  test("genIgu · siempre falta algo y los personajes son distintos", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genIgu, nivel)) {
        const d = ej.d;
        assert.ok(d.max > d.min, `igualación ${d.min}→${d.max}: no hay nada que igualar`);
        assert.ok(d.min > 0, "igualación con cantidad de partida no positiva");
        assert.notEqual(d.pa, d.pb, "los dos personajes de la igualación son el mismo");
        assert.ok(typeof M.fraseIgu(d) === "string" && M.fraseIgu(d).length > 10, "frase de la igualación vacía");
      }
    }
  });

  test("genDif · el grande siempre primero", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genDif, nivel)) {
        assert.ok(ej.d.a > ej.d.b, `diferencia ${ej.d.a} vs ${ej.d.b}: el mayor va primero`);
      }
    }
  });

  test("genRel · horas válidas y objetivo dentro del día", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genRel, nivel)) {
        const d = ej.d;
        assert.ok(d.m >= 0 && d.m <= 59, `minutos fuera de rango: ${d.m}`);
        if (d.sub !== "suma") {
          assert.equal(d.m % 5, 0, `las agujas solo caen en múltiplos de 5, salió ${d.m}`);
          const maxH = d.modo24 ? 23 : 12;
          assert.ok(d.h >= (d.modo24 ? 0 : 1) && d.h <= maxH, `hora fuera de rango: ${d.h}`);
          if (nivel === 1) assert.ok([0, 30].includes(d.m), `nivel 1: en punto o y media, salió ${d.m}`);
          if (nivel === 2) assert.ok([0, 15, 30, 45].includes(d.m), `nivel 2: cuartos, salió ${d.m}`);
        }
        const obj = M.relObjetivo(d);
        assert.match(obj, /^\d{1,2}:\d{2}$/, `objetivo mal formado: ${obj}`);
        const [h, m] = obj.split(":").map(Number);
        assert.ok(h >= 0 && h <= 23 && m >= 0 && m <= 59, `objetivo fuera del día: ${obj}`);
      }
    }
  });

  test("genPes · el total cuadra con las pesas que se enseñan", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genPes, nivel)) {
        const d = ej.d;
        const total = M.pesTotal(d);
        assert.ok(total > 0, "peso de cero");
        if (d.sub === "lee") {
          assert.equal(total, d.n1 * 4 + d.nm * 2 + d.nq, "el total no coincide con las pesas");
          assert.ok(d.n1 + d.nm + d.nq >= 2, "hay que enseñar al menos dos pesas");
          assert.ok([d.n1, d.nm, d.nq].every(x => entero(x) && x >= 0), "número de pesas inválido");
        }
        assert.ok(M.pesoEnTexto(total).length > 0, "el peso no se sabe decir en palabras");
      }
    }
  });

  test("genMul · tablas ordenadas y rejilla en rango", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genMul, nivel)) {
        const d = ej.d;
        if (d.sub === "tabla") {
          assert.ok(d.a >= d.b, `tabla ${d.a}×${d.b}: el mayor primero`);
          assert.ok(d.a <= 10 && d.b <= 10, `tabla fuera del 10: ${d.a}×${d.b}`);
        }
        if (d.sub === "inverso") assert.ok(nivel >= 2, "el inverso no debería salir en nivel 1");
        if (d.sub === "rejilla") {
          assert.ok(d.m >= 2 && d.m <= 9, `multiplicador raro: ${d.m}`);
          assert.ok(d.N >= 10 && d.N <= 99, `número a trocear fuera de dos cifras: ${d.N}`);
        }
      }
    }
  });

  test("genDiv · los repartos salen exactos y el resto es menor que el divisor", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genDiv, nivel)) {
        const d = ej.d;
        assert.ok(d.k >= 2, `repartir entre ${d.k} no tiene sentido`);
        assert.ok(d.N > 0, "no hay nada que repartir");
        if (d.sub === "reparto") assert.equal(d.N % d.k, 0, `${d.N} entre ${d.k} no es exacto y se pide exacto`);
        if (d.sub === "resto") assert.ok(d.N % d.k < d.k, "resto imposible");
        if (d.sub === "rejilla") assert.ok(d.N > d.k, `${d.N} entre ${d.k}: no da ni para uno`);
      }
    }
  });

  /* Lo encontró una niña de 1º: le tocó repartir 12 caramelos entre 4 y se vino
     abajo. El primer reparto es "la mitad", no una mudanza. */
  test("genDiv · el primer reparto es de verdad para empezar", () => {
    for (const ej of muchas(M.genDiv, 1)) {
      const d = ej.d;
      assert.equal(d.sub, "reparto", "el nivel 1 no reparte con resto");
      assert.ok(d.k <= 3, `nivel 1: repartir entre ${d.k} es demasiado para empezar`);
      assert.ok(d.N <= 12, `nivel 1: ${d.N} cosas que repartir son demasiadas`);
      assert.ok(d.N / d.k <= 5, `nivel 1: ${d.N / d.k} a cada uno es mucha cuenta`);
    }
  });

  /* Geografía. Aquí "imposible" no es una cuenta que no sale, es un mapa en el
     que la pieza que se pide no existe o no se puede tocar: si el generador
     nombra una comunidad que no está dibujada, la niña se queda mirando el mapa
     sin nada que hacer. */
  test("genGeo · lo que se pregunta está siempre dibujado en el mapa", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genGeo, nivel)) {
        const d = ej.d;
        assert.equal(ej.t, "geo");
        assert.ok(d.mapa === "es" || d.mapa === "mu", `mapa desconocido: ${d.mapa}`);
        const p = M.piezaGeo(d.mapa, d.id);
        assert.ok(p, `nivel ${nivel}: pide "${d.id}", que no está en el mapa`);
        assert.ok(p.d && p.d.length > 20, `${p.n} no tiene trazado que tocar`);
        assert.ok(Number.isFinite(p.cx) && Number.isFinite(p.cy), `${p.n} no tiene punto donde señalar`);
      }
    }
  });

  test("genGeo · las opciones son sanas y del mismo tipo", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genGeo, nivel)) {
        const d = ej.d;
        if (d.sub !== "cual") continue;
        const nombre = M.piezaGeo(d.mapa, d.id).n;
        opcionesSanas(d.ops, d.id, `geo nivel ${nivel} (${nombre})`);
        assert.equal(d.ops.length, nivel >= 3 ? 4 : 3, `geo nivel ${nivel}: número de opciones raro`);
        /* nunca se mezcla un océano con un continente: la pregunta se
           contestaría sola sin mirar el mapa */
        const clases = new Set(d.ops.map(id => M.piezaGeo(d.mapa, id).k || "r"));
        assert.equal(clases.size, 1, `geo nivel ${nivel}: las opciones mezclan tipos [${[...clases]}]`);
      }
    }
  });

  test("genGeo · el nivel 1 no pregunta por Ceuta ni por el Glacial Ártico", () => {
    for (const ej of muchas(M.genGeo, 1)) {
      const d = ej.d, p = M.piezaGeo(d.mapa, d.id);
      if (d.mapa === "es") assert.equal(p.niv, 1, `nivel 1 preguntando por ${p.n}`);
      else assert.ok(!/Glacial/.test(p.n), `nivel 1 preguntando por ${p.n}`);
    }
    /* y en el 3 sí sale el mapa entero */
    const vistos = new Set(muchas(M.genGeo, 3, 1200).map(ej => ej.d.id));
    ["can", "bal", "ceu", "mel"].forEach(id =>
      assert.ok(vistos.has(id), `el nivel 3 no llega a preguntar por ${M.piezaGeo("es", id).n}`));
  });

  /* Naturaleza. Los tres modos fallan de maneras distintas: señalar una parte que
     no está dibujada, un ciclo con pasos repetidos o que falten (y entonces no se
     puede terminar de ordenar), y una cesta a la que no va ninguna de las cosas
     que salen. */
  test("genCie · señalar: la parte pedida está dibujada y se puede tocar", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genSenala, nivel)) {
        const d = ej.d;
        const L = M.laminaDe(d.lam);
        assert.ok(L, `lámina desconocida: ${d.lam}`);
        const p = M.parteLam(d.lam, d.id);
        assert.ok(p, `nivel ${nivel}: pide "${d.id}", que no está en ${d.lam}`);
        assert.ok(p.niv <= nivel, `nivel ${nivel} preguntando por ${p.n} (es de nivel ${p.niv})`);
        assert.ok(p.d.length > 20 && p.rr > 3, `${p.n} no se puede señalar ni tocar`);
        if (d.modo === "cual") opcionesSanas(d.ops, d.id, `cie ${d.lam} nivel ${nivel}`);
      }
    }
  });

  test("genCie · ordenar: están todos los pasos del ciclo, una sola vez", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genOrdena, nivel)) {
        const c = M.CICLOS.find(x => x.id === ej.d.ciclo);
        assert.ok(c, `ciclo desconocido: ${ej.d.ciclo}`);
        assert.ok(c.niv <= nivel, `nivel ${nivel} sacando "${c.n}"`);
        const orden = ej.d.orden.slice().sort((a, b) => a - b);
        assert.deepEqual(orden, c.pasos.map((_, i) => i),
          `"${c.n}": los pasos barajados no cuadran con el ciclo`);
      }
    }
  });

  test("genCie · clasificar: cada cosa tiene su cesta y no se repite ninguna", () => {
    for (const nivel of [1, 2, 3]) {
      for (const ej of muchas(M.genClasifica, nivel)) {
        const c = M.CESTAS.find(x => x.id === ej.d.cesta);
        assert.ok(c, `clasificación desconocida: ${ej.d.cesta}`);
        assert.ok(c.niv <= nivel, `nivel ${nivel} sacando "${c.n}"`);
        const claves = c.cestas.map(x => x[0]);
        assert.ok(ej.d.cosas.length >= 3, "hacen falta al menos 3 cosas que clasificar");
        const emojis = ej.d.cosas.map(x => x[0]);
        assert.equal(new Set(emojis).size, emojis.length, `"${c.n}": sale la misma cosa dos veces`);
        ej.d.cosas.forEach(([emo, k]) => {
          assert.ok(claves.includes(k), `"${c.n}": ${emo} va a una cesta que no existe (${k})`);
          const real = c.cosas.find(x => x[0] === emo);
          assert.equal(real[1], k, `"${c.n}": ${emo} está mal clasificado`);
        });
        /* con 3 cestas y 4 cosas alguna se queda vacía; con 2 nunca */
        if (claves.length === 2)
          assert.equal(new Set(ej.d.cosas.map(x => x[1])).size, 2, `"${c.n}": todas las cosas van a la misma cesta`);
      }
    }
  });

  test("genCie · reparte los tres modos de preguntar", () => {
    const modos = {};
    for (const ej of muchas(M.genCie, 3, 600)) modos[ej.d.sub] = (modos[ej.d.sub] || 0) + 1;
    ["senala", "ordena", "clasifica"].forEach(m =>
      assert.ok(modos[m] > 30, `el modo "${m}" casi no sale (${modos[m] || 0} de 600)`));
  });

  test("genTanda y la misión diaria entregan lo que prometen", () => {
    for (const n of [4, 6, 10]) {
      const t = M.genTanda(["abn", "igu", "rel"], 2, n);
      assert.equal(t.length, n, "la tanda no trae los ejercicios pedidos");
      t.forEach(ej => assert.ok(M.GEN[ej.t], `tipo desconocido en la tanda: ${ej.t}`));
    }
    for (let i = 0; i < 50; i++) {
      const m = M.genMisionDiaria();
      assert.equal(m.length, 6, "la misión diaria debe traer 6 ejercicios");
      m.forEach(ej => assert.ok(ej && ej.t && ej.d, "ejercicio vacío en la misión diaria"));
    }
  });

  /* El otro fallo que salió jugando: la misión del día sacaba el nivel solo de la
     maestría acumulada, así que una niña de 1º podía acabar en nivel 3 sin haber
     dado eso en clase. El nivel cuelga del CURSO; la maestría solo mueve un
     escalón. Se mira a través de la división, que cambia de forma en cada nivel. */
  test("la misión diaria no adelanta al curso del peque", () => {
    const primero = cargaMotor("primaria", { nivel: 1 });
    for (let i = 0; i < 200; i++) {
      for (const ej of primero.genMisionDiaria()) {
        if (ej.t !== "div") continue;
        assert.equal(ej.d.sub, "reparto", "a un peque de 1º no le puede caer división de nivel 2 o 3");
        assert.ok(ej.d.N <= 12, `a un peque de 1º le han caído ${ej.d.N} cosas que repartir`);
      }
    }
  });

  test("…pero al mayor tampoco lo deja atascado en el nivel 1", () => {
    const tercero = cargaMotor("primaria", { nivel: 3 });
    let avanzados = 0;
    for (let i = 0; i < 200; i++) {
      for (const ej of tercero.genMisionDiaria()) {
        if (ej.t === "div" && ej.d.sub !== "reparto") avanzados++;
      }
    }
    assert.ok(avanzados > 0, "en 3º de primaria la división debería pasar del reparto simple");
  });
});

describe("motor de infantil", () => {
  const M = cargaMotor("infantil");

  test("genNum · la respuesta buena está entre las opciones", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genNum, nivel)) {
        const d = ej.d;
        if (d.sub === "contar") {
          assert.ok(d.n >= 1, "contar cero cosas");
          opcionesSanas(d.ops, d.n, `contar ${d.n}`);
          assert.ok(d.emoji && d.nombre, "faltan los dibujos que hay que contar");
        }
        if (d.sub === "busca") opcionesSanas(d.ops, d.n, `busca el ${d.n}`);
        if (d.sub === "falta") {
          assert.equal(d.serie.length, 4, "la serie debe tener 4 números");
          const paso = d.serie[1] - d.serie[0];
          d.serie.forEach((v, i) => {
            if (i > 0) assert.equal(v - d.serie[i - 1], paso, `serie que cambia de paso: [${d.serie}]`);
          });
          assert.ok(d.serie.every(v => v >= 0), `serie con negativos: [${d.serie}]`);
          assert.ok(d.hueco > 0 && d.hueco < 4, "el hueco no puede estar en los extremos");
          opcionesSanas(d.ops, d.serie[d.hueco], `serie [${d.serie}]`);
        }
      }
    }
  });

  test("genAmi · los amigos suman el total", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genAmi, nivel)) {
        const d = ej.d;
        if (d.sub === "inverso") {
          assert.equal(d.x + d.y, d.ops.find(o => o === d.x + d.y), "el total no está entre las opciones");
          opcionesSanas(d.ops, d.x + d.y, `¿de quién son amigos ${d.x} y ${d.y}?`);
        } else {
          assert.ok(d.x >= 0 && d.x <= d.total, `${d.x} no puede ser amigo de ${d.total}`);
          opcionesSanas(d.ops, d.total - d.x, `amigos del ${d.total} con ${d.x}`);
        }
      }
    }
  });

  test("genVec · los dos vecinos están entre las opciones", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genVec, nivel)) {
        const d = ej.d;
        assert.ok(d.n >= 1, "el número no puede ser 0 o negativo");
        assert.ok(d.chips.includes(d.n - 1), `falta el vecino ${d.n - 1} de ${d.n} en [${d.chips}]`);
        assert.ok(d.chips.includes(d.n + 1), `falta el vecino ${d.n + 1} de ${d.n} en [${d.chips}]`);
        assert.ok(!d.chips.includes(d.n), `el propio ${d.n} aparece entre sus vecinos [${d.chips}]`);
        assert.equal(new Set(d.chips).size, d.chips.length, `vecinos repetidos en [${d.chips}]`);
      }
    }
  });

  test("genFam · las familias son coherentes", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genFam, nivel)) {
        const d = ej.d;
        if (d.sub === "de") {
          assert.equal(Math.floor(d.n / 10) * 10, d.fam, `el ${d.n} no es de la familia del ${d.fam}`);
          opcionesSanas(d.ops, d.fam, `familia del ${d.n}`);
        }
        if (d.sub === "toca") {
          d.buenos.forEach(v => assert.equal(Math.floor(v / 10) * 10, d.fam, `${v} no es de la familia del ${d.fam}`));
          d.buenos.forEach(v => assert.ok(d.todos.includes(v), `el bueno ${v} no está entre los que se pueden tocar`));
          assert.ok(d.todos.length > d.buenos.length, "no hay ningún intruso que descartar");
        }
        if (d.sub === "completa") {
          d.faltan.forEach(v => {
            assert.equal(Math.floor(v / 10) * 10, d.fam, `el hueco ${v} no es de la familia del ${d.fam}`);
            assert.ok(d.chips.includes(v), `falta la ficha ${v} para rellenar su hueco`);
          });
        }
        if (d.sub === "tabla") {
          assert.ok(d.huecos.length >= 3, "muy pocos huecos en la tabla");
          d.huecos.forEach(v => assert.ok(v >= 10 && v <= 99, `hueco fuera de la tabla: ${v}`));
        }
      }
    }
  });

  test("genSub · lo que se enseña un instante se puede contar", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genSub, nivel)) {
        const d = ej.d;
        assert.ok(d.n >= 1 && d.n <= 10, `subitizar ${d.n} es demasiado`);
        assert.ok(d.flash >= 500, "el destello es tan corto que no da tiempo a verlo");
        if (d.disp === "dado") assert.ok(d.n <= 6, `un dado no puede enseñar ${d.n}`);
        if (d.disp === "dadodoble") assert.ok(d.n >= 6 && d.n <= 12, `dos dados no pueden enseñar ${d.n}`);
        opcionesSanas(d.ops, d.n, `subitización de ${d.n}`);
      }
    }
  });

  test("genPal · los palillos cuadran con el número", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genPal, nivel)) {
        const d = ej.d;
        assert.equal(d.n, d.p * 10 + d.s, `${d.p} paquetes y ${d.s} sueltos no son ${d.n}`);
        assert.ok(d.s <= 9, `${d.s} sueltos: 10 sueltos son un paquete`);
        if (d.sub === "lee") opcionesSanas(d.ops, d.n, `leer ${d.p} paquetes y ${d.s} sueltos`);
        if (d.sub === "haz") {
          const buena = d.bandejas.filter(b => b.p === d.p && b.s === d.s);
          assert.equal(buena.length, 1, `hacer ${d.n}: debe haber exactamente una bandeja correcta`);
        }
      }
    }
  });

  test("genRet · la cuenta atrás siempre baja", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genRet, nivel)) {
        const d = ej.d;
        if (d.sub === "cohete") {
          assert.ok(d.desde > d.hasta, `cuenta atrás de ${d.desde} a ${d.hasta}: no baja`);
          assert.ok(d.hasta >= 0, "la cuenta atrás no puede pasar de cero");
        }
        if (d.sub === "antes") {
          assert.ok(d.from >= 2, "no hay número antes del 1");
          opcionesSanas(d.ops, d.from - 1, `el anterior al ${d.from}`);
        }
      }
    }
  });

  test("genSil y genTra · solo letras que la app sabe decir y dibujar", () => {
    for (const nivel of [1, 2, 3, 4]) {
      for (const ej of muchas(M.genTra, nivel, 200)) {
        assert.ok(M.NOMBRE_LETRA[ej.d.letra], `la app no sabe decir "${ej.d.letra}"`);
      }
      for (const ej of muchas(M.genSil, nivel, 200)) {
        assert.ok(ej.d && ej.d.sub, "sílaba sin subtipo");
        if (Array.isArray(ej.d.ops)) {
          assert.ok(ej.d.ops.length >= 2, "hacen falta al menos dos opciones");
          assert.equal(new Set(ej.d.ops.map(o => JSON.stringify(o))).size, ej.d.ops.length, "opciones de sílaba repetidas");
        }
      }
    }
  });

  test("la misión diaria trae 6 ejercicios jugables", () => {
    for (let i = 0; i < 50; i++) {
      const m = M.genMisionDiaria();
      assert.equal(m.length, 6, "la misión diaria debe traer 6 ejercicios");
      m.forEach(ej => assert.ok(M.GEN[ej.t], `tipo desconocido en la misión diaria: ${ej.t}`));
    }
  });
});
