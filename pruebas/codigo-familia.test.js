/*
 * El código de familia ES la llave de los datos (las políticas RLS comparan
 * contra él), así que estas pruebas vigilan lo único que lo protege: que no se
 * pueda adivinar barriendo. Los de la primera época (LUNA-847) tenían 18.000
 * combinaciones y se barrían en minutos; eso no puede volver a pasar.
 *
 * Prueban EL MISMO código que corre en el portal (recortado de app/index.html),
 * no una copia.
 */
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { recorta, jsDelMotor } = require("./motor.js");

const src = jsDelMotor(path.join(__dirname, "..", "app", "index.html"));
const piezas = ["COD_PALABRAS", "COD_ALFABETO", "azar", "nuevoCodigoFamilia", "esCodigoDebil", "esCodigoValido"]
  .map(p => recorta(src, p)).join("\n");
const M = new Function(piezas +
  "\nreturn { COD_PALABRAS, COD_ALFABETO, nuevoCodigoFamilia, esCodigoDebil, esCodigoValido };")();

const FUERTE = /^[A-ZÑ]{2,12}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

describe("código de familia (la llave)", () => {

  test("los códigos nuevos son fuertes, válidos y nunca del formato débil", () => {
    for (let i = 0; i < 500; i++) {
      const c = M.nuevoCodigoFamilia();
      assert.match(c, FUERTE, `código con formato raro: ${c}`);
      assert.ok(M.esCodigoValido(c), `el portal no aceptaría su propio código: ${c}`);
      assert.ok(!M.esCodigoDebil(c), `un código nuevo jamás puede ser del formato débil: ${c}`);
    }
  });

  test("el espacio de claves no se puede barrer", () => {
    // La primera época: 20 palabras × 900 números = 18.000. Un barrido a 50
    // peticiones/segundo lo recorría en 6 minutos. El formato nuevo tiene que
    // estar a AÑOS de distancia, no a minutos.
    const espacio = M.COD_PALABRAS.length * Math.pow(M.COD_ALFABETO.length, 8);
    assert.ok(espacio > 1e12, `solo ${espacio.toExponential(1)} combinaciones: barrible`);
  });

  test("el alfabeto se puede dictar por teléfono sin dudas", () => {
    // Ni O/0, ni I/L/1, ni U/V: si un abuelo dicta el código, no hay ambigüedad
    for (const mala of "O0IL1UV") {
      assert.ok(!M.COD_ALFABETO.includes(mala), `el alfabeto lleva "${mala}", que se confunde al dictar`);
    }
    assert.equal(new Set(M.COD_ALFABETO).size, M.COD_ALFABETO.length, "alfabeto con caracteres repetidos");
  });

  test("dos mil códigos seguidos y ni una repetición", () => {
    const vistos = new Set();
    for (let i = 0; i < 2000; i++) vistos.add(M.nuevoCodigoFamilia());
    assert.equal(vistos.size, 2000, "han salido códigos repetidos: el azar no es de fiar");
  });

  test("los códigos de la primera época siguen entrando (compatibilidad)", () => {
    // Las familias que ya existen no se pueden quedar fuera: su código débil
    // sigue siendo válido hasta que lo refuercen desde el portal.
    assert.ok(M.esCodigoValido("LUNA-847"), "un código de la primera época dejó de ser válido");
    assert.ok(M.esCodigoDebil("LUNA-847"), "LUNA-847 tiene que detectarse como débil");
    assert.ok(M.esCodigoValido("PRUEBAA-1234"), "los códigos de las pruebas de aislamiento tienen que valer");
    assert.ok(!M.esCodigoValido("'; drop table pm_misiones; --"), "un código no puede ser texto libre");
    assert.ok(!M.esCodigoValido(""), "el código vacío no vale");
    assert.ok(!M.esCodigoValido(null), "sin código no hay familia");
  });
});
