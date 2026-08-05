/* ═══════════════════════════════════════════════════════════════════
   MODO PADRES — qué está aprendiendo y cómo ayudar (D-04, v1 escrita)
   ═══════════════════════════════════════════════════════════════════
   Muchos colegios usan ABN y los padres no saben ayudar: se aprendieron las
   cuentas en columna y ahora ven a su hijo haciendo saltos en una rejilla.
   Esto no es documentación: es lo que le dirías a un amigo en la cocina.

   Un solo archivo compartido por los dos motores: si se mejora una explicación,
   mejora en todas partes. Reglas de escritura:
     · nada de jerga pedagógica sin traducir
     · el ejemplo va con números pequeños y se puede seguir de cabeza
     · "cómo ayudar" siempre incluye qué NO hacer
     · frases literales que el padre puede decir tal cual
*/
const AYUDA_ABN = {

  /* ── Por qué ABN, lo primero que hay que entender ── */
  _intro: {
    emoji: "🧭", titulo: "¿Qué es eso del método ABN?",
    queEs: `ABN significa "algoritmos basados en números". En cristiano: en vez de colocar
      las cuentas en columna y llevarse una, se trabaja con las cantidades enteras y el niño
      elige por dónde ir. Nadie le dice qué saltos dar: los elige él.`,
    comoSeHace: `Para 47 + 25, un niño puede sumar primero 20 y luego 5, o sumar 3 para
      llegar a 50 y luego 22. <b>Los dos caminos son correctos.</b> Lo que importa es que
      entienda qué está haciendo con las cantidades, no que repita un procedimiento.`,
    comoAyudar: `Resiste la tentación de enseñarle "tu" manera (la de la columna). No es que
      esté mal, es que ahora mismo le confunde. Si tú te aburres viendo cuántos pasos da, es
      buena señal: está pensando, no ejecutando.`,
    frases: ["¿Por dónde vas a empezar tú?", "Vale, hazlo a tu manera y me lo cuentas"]
  },

  /* ── PRIMARIA ── */
  abn: {
    emoji: "🧮", titulo: "Rejillas: sumar y restar por saltos",
    queEs: `Sumar y restar números de dos y tres cifras eligiendo sus propios pasos, en una
      tabla abierta. Es el corazón del método.`,
    comoSeHace: `En la rejilla hay una columna para lo que va quitando y otra para lo que le
      va quedando. En 62 − 27 puede quitar 20 (le quedan 42), luego 2 (40) y luego 5 (35).
      O quitar 30 y devolver 3. <b>Cualquier camino vale si cada fila cuadra.</b>`,
    comoAyudar: `Si se atasca, no le des el siguiente paso: pregúntale cuánto le falta para
      llegar a una decena redonda. Ese es el truco que abre casi todos los ejercicios.`,
    frases: ["¿Cuánto te falta para llegar a la decena de al lado?",
             "¿Prefieres quitar de golpe y devolver, o poquito a poco?"]
  },
  cla: {
    emoji: "📝", titulo: "La cuenta de toda la vida",
    queEs: `La suma y la resta en columna, la que aprendimos nosotros. Convive con la
      rejilla: primero se entiende con cantidades, después se automatiza.`,
    comoSeHace: `Unidades con unidades, decenas con decenas, y la llevada. Aquí sí hay un
      único camino correcto.`,
    comoAyudar: `No la introduzcas antes de tiempo. Si en el cole todavía van por rejillas y
      tú le enseñas la columna, lo normal es que se líe y pierda la comprensión que estaba
      ganando. Pregunta en el cole por dónde van.`,
    frases: ["Cuéntame qué has hecho aquí", "¿Te sale igual haciéndolo con la rejilla?"]
  },
  igu: {
    emoji: "⚖️", titulo: "Igualaciones: ¿cuánto le falta a uno para tener lo mismo?",
    queEs: `Comparar dos cantidades y averiguar cuánto hay que poner (o quitar) para
      igualarlas. Es una resta, pero pensada como comparación, que es como aparece en la
      vida real.`,
    comoSeHace: `Si Aurora tiene 53 y Nube tiene 90, va poniéndole a Aurora de poco en poco
      (7 para llegar a 60, luego 30 para llegar a 90) y al final <b>suma sus propios
      movimientos</b>: 37. Esa suma es la respuesta.`,
    comoAyudar: `Hazlo con objetos de casa: dos montones de garbanzos y a igualarlos. La
      idea de "cuánto le falta" se entiende mucho antes con las manos que en la pantalla.`,
    frases: ["¿Quién tiene más? ¿Cuánto más?",
             "Si le vas dando de poquito, ¿cuánto le has dado en total?"]
  },
  dif: {
    emoji: "📏", titulo: "Diferencias: quitar a los dos a la vez",
    queEs: `Otra forma de restar: en vez de quitarle a uno, se les quita lo mismo a los dos
      hasta que uno se queda a cero. Lo que le queda al otro es la diferencia.`,
    comoSeHace: `Con 74 y 48: quito 8 a los dos (66 y 40), quito 40 a los dos (26 y 0).
      La diferencia es 26. Suena raro la primera vez y es un método potentísimo.`,
    comoAyudar: `Si te parece un rodeo, míralo así: es lo mismo que hacemos al calcular la
      diferencia de edad entre dos personas. Nunca restamos en columna para eso.`,
    frases: ["¿Cuánto le quitamos a los dos para que uno llegue a una decena?"]
  },
  mul: {
    emoji: "✖️", titulo: "Multiplicar: construir la tabla, no recitarla",
    queEs: `Entender que multiplicar es repetir, y llegar a las tablas por comprensión antes
      que por memoria.`,
    comoSeHace: `Para 7 × 6 no hace falta habérsela aprendido: sabe que 7 × 5 es 35 y suma
      otro 7. Y para multiplicar números grandes, trocea: 24 × 6 es 20 × 6 más 4 × 6.`,
    comoAyudar: `Que se sepa las tablas de memoria está muy bien, <b>pero después</b>. Si
      solo memoriza, se queda atascado el día que se le olvida una.`,
    frases: ["¿Y si te apoyas en una que sí te sepas?", "Trocéalo: ¿por dónde lo partirías?"]
  },
  div: {
    emoji: "➗", titulo: "Dividir: repartir de verdad",
    queEs: `Repartir una cantidad en partes iguales, y entender qué es lo que sobra.`,
    comoSeHace: `Para 26 entre 4 va repartiendo por rondas: primero 5 a cada uno (20
      repartidos, quedan 6), luego 1 más a cada uno (24, quedan 2). Resultado: 6 y sobran 2.`,
    comoAyudar: `Repártele cosas de verdad: galletas entre los primos. Cuando pregunte "¿y
      las que sobran?", ese es exactamente el resto, y ya lo ha entendido.`,
    frases: ["¿Cuántas le puedes dar a cada uno sin pasarte?", "¿Qué hacemos con lo que sobra?"]
  },
  rel: {
    emoji: "🕐", titulo: "El reloj",
    queEs: `Leer la hora en agujas, y sumar o restar minutos. Es de las cosas más útiles y
      de las que menos se practican en casa.`,
    comoSeHace: `Primero en punto y media, después los cuartos, y por último los minutos
      sueltos. Sumar minutos es contar de cinco en cinco por la esfera.`,
    comoAyudar: `Ten un reloj de agujas a la vista y pregúntale la hora en voz alta a lo
      largo del día. Es la práctica que mejor funciona, y no cuesta nada.`,
    frases: ["¿Cuánto falta para cenar?", "Si son y veinte, ¿qué hora será en media hora?"]
  },
  pes: {
    emoji: "⚖️", titulo: "Pesos: kilos, medios y cuartos",
    queEs: `Componer un peso con pesas de 1 kg, ½ kg y ¼ kg. Detrás hay fracciones, pero
      entrando por la puerta buena: tocando.`,
    comoSeHace: `Un kilo y tres cuartos son una pesa de 1 y tres de cuarto, o una de 1, una
      de medio y una de cuarto. <b>Varias combinaciones son correctas.</b>`,
    comoAyudar: `La báscula de la cocina es el mejor material del mundo para esto. Pesad
      juntos la harina de un bizcocho.`,
    frases: ["¿Con qué pesas lo montarías?", "¿Cuántos cuartos hay en medio kilo?"]
  },

  /* ── INFANTIL ── */
  num: {
    emoji: "🔢", titulo: "Los números: contar, buscar y seguir la serie",
    queEs: `Contar de verdad (no recitar), reconocer la grafía del número y continuar
      series. La base de todo lo que vendrá después.`,
    comoSeHace: `Contar bien es señalar cada cosa una sola vez y saber que el último número
      que dices es <b>cuántas hay</b>. Eso último no es obvio a los 4 años.`,
    comoAyudar: `Contad cosas reales todo el rato: escalones, cucharadas, coches rojos. Y de
      vez en cuando pregúntale "¿cuántas había?" después de contar, para asentar la idea.`,
    frases: ["¿Cuántas había al final?", "Cuenta despacito y toca cada una"]
  },
  sub: {
    emoji: "👀", titulo: "Ojo veloz: ver cuántos hay sin contar",
    queEs: `Se llama subitización: reconocer de un vistazo cuántos objetos hay, como en la
      cara de un dado, sin ir uno por uno. Es una de las bases del cálculo mental.`,
    comoSeHace: `Se le enseña un instante y desaparece. Si tuviera tiempo, contaría; de lo
      que se trata es de que <b>vea</b> la cantidad de golpe.`,
    comoAyudar: `Juega con dados y con las manos: enseña tres dedos de golpe y que diga
      cuántos son sin contarlos. Dos minutos al día bastan.`,
    frases: ["Sin contar, ¿cuántos crees que había?", "¡Casi! ¿Los vemos otra vez?"]
  },
  pal: {
    emoji: "🥢", titulo: "Palillos: por qué diez sueltos son un paquete",
    queEs: `Entender que el 34 son 3 paquetes de diez y 4 sueltos. Es el nacimiento del
      sistema decimal, y sin esto las llevadas nunca tienen sentido.`,
    comoSeHace: `Cuando junta diez palillos sueltos, los ata y se convierten en UN paquete.
      Así el número deja de ser dos dibujos y pasa a ser una cantidad.`,
    comoAyudar: `Hazlo en casa con pajitas y una goma elástica. Cuando lo haya atado él con
      sus manos, lo entiende para siempre.`,
    frases: ["¿Cuántos paquetes tienes? ¿Y sueltos?", "¿Ya tienes diez para atar otro?"]
  },
  ret: {
    emoji: "🚀", titulo: "Cuenta atrás: contar hacia atrás",
    queEs: `Contar hacia atrás. Parece un juego de cohetes y es, literalmente, la base de la
      resta.`,
    comoSeHace: `Del 10 al 0, y más adelante desde cualquier número. Saber decir el anterior
      de un número es más difícil que decir el siguiente.`,
    comoAyudar: `Cuenta atrás para todo: para apagar la luz, para saltar, para salir de
      casa. Es de las cosas que más se practican jugando.`,
    frases: ["¿Cuál va antes del siete?", "¡Contamos atrás para despegar!"]
  },
  ami: {
    emoji: "🤝", titulo: "Los amigos del 10 (y del 5, y del 20)",
    queEs: `Las parejas que suman diez: 7 y 3, 6 y 4… Cuando las tiene automatizadas, el
      cálculo mental se le vuelve fácil de golpe.`,
    comoSeHace: `Con un marco de diez casillas: si hay 6 llenas, se ve que faltan 4. Se
      trata de que lo VEA, no de que lo calcule.`,
    comoAyudar: `Con los dedos: tú levantas 6 y él levanta los que faltan para 10. Rápido y
      sin papel. Es el ejercicio con mejor relación esfuerzo/resultado que existe.`,
    frases: ["Si tengo 6, ¿cuántos te faltan a ti?", "¿Cuánto le falta al 8 para ser 10?"]
  },
  vec: {
    emoji: "🏘️", titulo: "Vecinos: el de antes y el de después",
    queEs: `Saber qué número va justo antes y justo después. Suena simple y es la diferencia
      entre recitar la serie y entenderla.`,
    comoSeHace: `Los vecinos del 47 son el 46 y el 48. En el nivel de reto aparecen los
      cambios de decena (39, 40, 41), que es donde se atascan casi todos.`,
    comoAyudar: `Los saltos de decena son el punto difícil: el 39 y el 40, el 69 y el 70.
      Practicad justo esos.`,
    frases: ["¿Quién vive antes del 40?", "¿Y el vecino de después?"]
  },
  fam: {
    emoji: "👨‍👩‍👧", titulo: "Familias y la tabla del 100",
    queEs: `La familia del 30 son todos los treinta y algo. Ver la tabla del 100 entera y
      moverse por ella le da una foto mental de los números.`,
    comoSeHace: `En la tabla, bajar una fila es sumar diez y moverse a la derecha es sumar
      uno. Cuando descubre eso, la tabla se le convierte en una herramienta.`,
    comoAyudar: `Ten una tabla del 100 pegada en la nevera (hay una gratis en nuestra web) y
      jugad a "estoy pensando en un número de la familia del 50".`,
    frases: ["¿De qué familia es este número?", "Si bajo una fila, ¿cuánto he sumado?"]
  },
  sil: {
    emoji: "🔤", titulo: "Sílabas: cómo suenan las letras juntas",
    queEs: `Unir una consonante con una vocal y oír lo que sale: la puerta de la lectura.`,
    comoSeHace: `"La ele con la a suena LA". Primero se oye, después se reconoce y por
      último se lee.`,
    comoAyudar: `Nombra las letras por su SONIDO ("sss"), no por su nombre ("ese"). Con el
      nombre, "sssapo" se le convierte en "ese-a-pe-o" y no hay manera.`,
    frases: ["¿Cómo suena esta con la a?", "¿Qué palabra empieza como tu nombre?"]
  },
  tra: {
    emoji: "✍️", titulo: "Trazar letras y números",
    queEs: `Escribir cada letra siguiendo el recorrido correcto, con el dedo antes que con
      el lápiz.`,
    comoSeHace: `Cada letra tiene un punto de partida y una dirección. Hacerla "como salga"
      pasa factura después, cuando escribe rápido.`,
    comoAyudar: `Que la haga en grande: en el aire, en la arena, en la espalda de un
      hermano. La letra pequeña en el papel es lo último, no lo primero.`,
    frases: ["¿Por dónde empieza esta letra?", "Hazla gigante en el aire"]
  }
};

/* Consejos que no dependen del módulo: se enseñan siempre arriba del todo. */
const AYUDA_GENERAL = [
  { emoji: "⏳", titulo: "Diez minutos bien valen más que una hora mal",
    texto: `Con estas edades, la atención se agota antes que las ganas. Es mejor parar cuando
      todavía se lo está pasando bien: así mañana vuelve.` },
  { emoji: "🤐", titulo: "Aguanta el silencio",
    texto: `Cuando se queda pensando, cuenta hasta diez antes de decir nada. Ese silencio
      incómodo para ti es exactamente el momento en el que él está aprendiendo.` },
  { emoji: "🎯", titulo: "Pregunta, no corrijas",
    texto: `En vez de "está mal", prueba con "cuéntame cómo lo has hecho". La mitad de las
      veces se da cuenta solo, y eso vale por diez correcciones tuyas.` },
  { emoji: "💎", titulo: "Premia que lo intente, no que acierte",
    texto: `Aquí las gemas se ganan por terminar el ejercicio, también con ayuda. Es a
      propósito: lo que queremos reforzar es que vuelva mañana, no que sea infalible.` }
];
