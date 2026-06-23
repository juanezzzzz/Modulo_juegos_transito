/* ═══════════════════════════════════════════════════════════
   ESCAPE ROOM VIAL — Motor del Juego
   Proyecto SMVI | Yopal, Casanare | 2025
   Responsable: Katherine
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────────────────
// ESTADO GLOBAL DEL JUEGO
// ──────────────────────────────────────────────────────────
const Estado = {
  salaActual:       0,       // índice de la sala en curso (0-3)
  acertijoActual:   0,       // índice del acertijo en curso dentro de la sala
  puntaje:          1000,    // puntaje inicial (se descuenta por errores y pistas)
  pistaUsada:       false,   // si el jugador ya usó la pista en el acertijo actual
  acertijosCorrectos: 0,     // contador global de aciertos
  salasDatos:       [],      // array con los JSON de las 4 salas cargadas
  salaCompletada:   false,   // bandera para evitar doble avance
  tiempoTotal:      20 * 60, // 20 minutos en segundos
  tiempoTranscurrido: 0,
  intervalo:        null,    // referencia al setInterval del temporizador
  juegoActivo:      false,
  pausado:          false,   // estado de pausa
  pistasUsadas:     0,       // contador de pistas usadas
  erroresComputados: 0,      // contador de respuestas incorrectas
  insignias:        [],      // array de insignias desbloqueadas
};

// Penalizaciones
const PENALIDAD_ERROR        = 50;
const PENALIDAD_PISTA        = 10;
const PENALIDAD_TIEMPO_FINAL = 2;  // puntos por segundo restante (bono)
const BONO_POR_SEGUNDO       = 2;

// ──────────────────────────────────────────────────────────
// UTILIDAD: MEZCLA ALEATORIA (Fisher-Yates)
// ──────────────────────────────────────────────────────────
function mezclar(array) {
  const arr = [...array]; // copia para no mutar el original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Rutas de los archivos JSON de salas
const RUTAS_SALAS = [
  'rooms/sala1.json',
  'rooms/sala2.json',
  'rooms/sala3.json',
  'rooms/sala4.json',
];

// ──────────────────────────────────────────────────────────
// INICIAR JUEGO
// ──────────────────────────────────────────────────────────
async function iniciarJuego() {
  mostrarPantalla('pantalla-carga');
  
  try {
    // Cargar todas las salas antes de mostrar la pantalla de juego
    Estado.salasDatos = await Promise.all(
      RUTAS_SALAS.map(ruta => fetch(ruta).then(r => r.json()))
    );
  } catch (error) {
    // Si fetch no está disponible (archivo local sin servidor),
    // usar los datos embebidos de respaldo
    Estado.salasDatos = DATOS_EMBEBIDOS;
    console.warn('Usando datos embebidos (abre el proyecto con un servidor local para fetch).');
  }

  // Reiniciar estado
  Estado.salaActual          = 0;
  Estado.acertijoActual      = 0;
  Estado.puntaje             = 1000;
  Estado.tiempoTranscurrido  = 0;
  Estado.acertijosCorrectos  = 0;
  Estado.juegoActivo         = true;
  Estado.pausado             = false;
  Estado.pistasUsadas        = 0;
  Estado.erroresComputados   = 0;
  Estado.insignias           = [];

  // Simular pequeño delay para efecto de carga
  await new Promise(r => setTimeout(r, 800));

  mostrarPantalla('pantalla-juego');
  iniciarTemporizador();
  cargarSala(0);
}

// ──────────────────────────────────────────────────────────
// TEMPORIZADOR
// ──────────────────────────────────────────────────────────
function iniciarTemporizador() {
  clearInterval(Estado.intervalo);
  Estado.intervalo = setInterval(tickTemporizador, 1000);
}

function tickTemporizador() {
  if (!Estado.juegoActivo || Estado.pausado) return;

  Estado.tiempoTranscurrido++;
  const restante = Estado.tiempoTotal - Estado.tiempoTranscurrido;

  if (restante <= 0) {
    clearInterval(Estado.intervalo);
    terminarJuego(false); // tiempo agotado
    return;
  }

  actualizarDisplayTiempo(restante);
}

function actualizarDisplayTiempo(segundos) {
  const min = String(Math.floor(segundos / 60)).padStart(2, '0');
  const seg = String(segundos % 60).padStart(2, '0');
  const el = document.getElementById('hud-tiempo');
  el.textContent = `${min}:${seg}`;

  // Alerta visual en últimos 2 minutos
  el.classList.toggle('urgente', segundos <= 120);
}

// ──────────────────────────────────────────────────────────
// CARGAR SALA
// ──────────────────────────────────────────────────────────
function cargarSala(indiceSala) {
  Estado.salaActual     = indiceSala;
  Estado.acertijoActual = 0;
  Estado.salaCompletada = false;

  // Clonar la sala y mezclar el orden de sus acertijos
  const salaOriginal = Estado.salasDatos[indiceSala];
  const sala = {
    ...salaOriginal,
    acertijos: mezclar(salaOriginal.acertijos),
  };
  Estado.salaActual_datos = sala; // guardar la versión mezclada

  // Actualizar HUD
  document.getElementById('hud-numero-sala').textContent = `${indiceSala + 1} / 4`;

  // Actualizar encabezado de sala
  document.getElementById('sala-badge').textContent       = `SALA ${indiceSala + 1}`;
  document.getElementById('sala-titulo').textContent      = sala.sala;
  document.getElementById('sala-descripcion').textContent = sala.descripcion;

  cargarAcertijo();
}

// ──────────────────────────────────────────────────────────
// CARGAR ACERTIJO
// ──────────────────────────────────────────────────────────
function cargarAcertijo() {
  // Usar la versión con preguntas ya mezcladas guardada en Estado
  const sala      = Estado.salaActual_datos;
  const acertijos = sala.acertijos;
  const idx       = Estado.acertijoActual;

  // Ocultar feedback y pista de la pregunta anterior
  ocultarFeedback();
  ocultarPista();
  Estado.pistaUsada = false;
  document.getElementById('btn-pista').disabled = false;

  // Número de acertijo
  document.getElementById('acertijo-numero').textContent =
    `Acertijo ${idx + 1} / ${acertijos.length}`;

  // Pregunta
  document.getElementById('acertijo-pregunta').textContent = acertijos[idx].pregunta;

  // ── Mezclar opciones manteniendo la referencia a la correcta ──
  const opcionesOriginales  = acertijos[idx].opciones;
  const textoCorrecta       = opcionesOriginales[acertijos[idx].correcta];

  // Crear array de objetos { texto, esCorrecta } y mezclar
  const opcionesConMarca = opcionesOriginales.map((texto, i) => ({
    texto,
    esCorrecta: i === acertijos[idx].correcta,
  }));
  const opcionesMezcladas = mezclar(opcionesConMarca);

  // Guardar en Estado el índice de la correcta DESPUÉS del shuffle
  Estado.indiceCorrectaActual = opcionesMezcladas.findIndex(o => o.esCorrecta);

  // Opciones: limpiar y regenerar
  const grid = document.getElementById('opciones-grid');
  grid.innerHTML = '';

  opcionesMezcladas.forEach((opcion, i) => {
    const btn = document.createElement('button');
    btn.className   = 'opcion-btn';
    btn.textContent = opcion.texto;
    btn.onclick     = () => evaluarRespuesta(i);
    grid.appendChild(btn);
  });

  // Actualizar barra de progreso de sala
  actualizarProgreso(idx, acertijos.length);
}

// ──────────────────────────────────────────────────────────
// EVALUAR RESPUESTA
// ──────────────────────────────────────────────────────────
function evaluarRespuesta(indiceSeleccionado) {
  if (!Estado.juegoActivo) return;

  const sala      = Estado.salaActual_datos;
  const acertijo  = sala.acertijos[Estado.acertijoActual];
  const correcta  = Estado.indiceCorrectaActual; // índice tras el shuffle de opciones

  // Deshabilitar todos los botones
  const botones = document.querySelectorAll('.opcion-btn');
  botones.forEach(b => b.disabled = true);

  if (indiceSeleccionado === correcta) {
    // ── CORRECTO ──────────────────────────────
    botones[indiceSeleccionado].classList.add('correcta');
    Estado.acertijosCorrectos++;
    mostrarFeedback(true, '✅ ' + (acertijo.explicacion || '¡Correcto! Muy bien.'));

    // Avanzar después de 2 segundos
    setTimeout(avanzarAcertijo, 2000);
  } else {
    // ── INCORRECTO ────────────────────────────
    botones[indiceSeleccionado].classList.add('incorrecta');
    botones[correcta].classList.add('correcta'); // mostrar la correcta
    Estado.puntaje = Math.max(0, Estado.puntaje - PENALIDAD_ERROR);
    Estado.erroresComputados++;
    actualizarPuntajeHUD();
    mostrarFeedback(false, '❌ ' + (acertijo.explicacion || 'Respuesta incorrecta.'));

    // Avanzar de todos modos después de 2.5 segundos
    setTimeout(avanzarAcertijo, 2500);
  }
}

// ──────────────────────────────────────────────────────────
// AVANZAR AL SIGUIENTE ACERTIJO O SALA
// ──────────────────────────────────────────────────────────
function avanzarAcertijo() {
  const sala           = Estado.salaActual_datos;
  const totalAcertijos = sala.acertijos.length;

  Estado.acertijoActual++;
  actualizarProgreso(Estado.acertijoActual, totalAcertijos);

  if (Estado.acertijoActual >= totalAcertijos) {
    // Sala completada
    mostrarTransicionSala();
  } else {
    cargarAcertijo();
  }
}

// ──────────────────────────────────────────────────────────
// TRANSICIÓN ENTRE SALAS
// ──────────────────────────────────────────────────────────
function mostrarTransicionSala() {
  Estado.juegoActivo = false; // pausar temporizador momentáneamente
  clearInterval(Estado.intervalo);

  const numSalaCompletada = Estado.salaActual + 1;
  const esUltimaSala      = Estado.salaActual === 3;

  document.getElementById('transicion-icono').textContent = esUltimaSala ? '🏆' : '✅';
  document.getElementById('transicion-titulo').textContent =
    esUltimaSala ? '¡Escape completado!' : `¡Sala ${numSalaCompletada} superada!`;
  document.getElementById('transicion-texto').textContent =
    esUltimaSala
      ? 'Has resuelto todas las salas del Escape Room Vial. ¡Eres un experto en seguridad vial!'
      : `Resolviste todos los acertijos de la sala ${numSalaCompletada}. Prepárate para la siguiente.`;

  document.getElementById('stat-sala-puntaje').textContent = Estado.puntaje + ' pts';
  document.getElementById('stat-sala-num').textContent     = `${numSalaCompletada}/4`;

  const btnSiguiente = document.getElementById('btn-siguiente-sala');
  if (esUltimaSala) {
    btnSiguiente.textContent = 'Ver resultados finales';
    btnSiguiente.onclick = () => terminarJuego(true);
  } else {
    btnSiguiente.textContent = 'Entrar a la siguiente sala →';
    btnSiguiente.onclick = siguienteSala;
  }

  mostrarPantalla('pantalla-transicion');
}

function siguienteSala() {
  const proximaSala = Estado.salaActual + 1;

  if (proximaSala >= Estado.salasDatos.length) {
    terminarJuego(true);
    return;
  }

  mostrarPantalla('pantalla-juego');
  Estado.juegoActivo = true;
  iniciarTemporizador();
  cargarSala(proximaSala);
}

// ──────────────────────────────────────────────────────────
// SISTEMA DE PISTAS
// ──────────────────────────────────────────────────────────
function usarPista() {
  if (Estado.pistaUsada || !Estado.juegoActivo) return;

  const sala     = Estado.salaActual_datos;
  const acertijo = sala.acertijos[Estado.acertijoActual];

  // Descontar puntos
  Estado.puntaje  = Math.max(0, Estado.puntaje - PENALIDAD_PISTA);
  Estado.pistaUsada = true;
  Estado.pistasUsadas++;
  actualizarPuntajeHUD();

  // Mostrar pista
  document.getElementById('pista-texto').textContent = '💡 ' + acertijo.pista;
  document.getElementById('pista-panel').classList.remove('oculto');
  document.getElementById('btn-pista').disabled = true;
}

function ocultarPista() {
  document.getElementById('pista-panel').classList.add('oculto');
  document.getElementById('pista-texto').textContent = '';
}

// ──────────────────────────────────────────────────────────
// SISTEMA DE INSIGNIAS Y LOGROS
// ──────────────────────────────────────────────────────────
const INSIGNIAS_DISPONIBLES = [
  {
    id: 'perfeccionista',
    nombre: 'Perfeccionista',
    icono: '✨',
    descripcion: 'Completa sin cometer errores',
    condicion: () => Estado.erroresComputados === 0
  },
  {
    id: 'maestro_pistas',
    nombre: 'Maestro de Pistas',
    icono: '🧠',
    descripcion: 'No usar ninguna pista',
    condicion: () => Estado.pistasUsadas === 0
  },
  {
    id: 'contrarreloj',
    nombre: 'Contra Reloj',
    icono: '⚡',
    descripcion: 'Completa en menos de 10 min',
    condicion: () => Estado.tiempoTranscurrido < 600
  },
  {
    id: 'rapido',
    nombre: 'Rápido y Furioso',
    icono: '🏃',
    descripcion: 'Menos de 5 minutos',
    condicion: () => Estado.tiempoTranscurrido < 300
  },
  {
    id: 'experto',
    nombre: 'Experto Vial',
    icono: '🎓',
    descripcion: 'Puntaje mayor a 1200',
    condicion: () => Estado.puntaje >= 1200
  }
];

function calcularInsignias() {
  Estado.insignias = [];
  INSIGNIAS_DISPONIBLES.forEach(insignia => {
    if (insignia.condicion()) {
      Estado.insignias.push(insignia);
    }
  });
  return Estado.insignias;
}

function mostrarInsignias() {
  const gridInsignias = document.getElementById('insignias-grid');
  gridInsignias.innerHTML = '';

  // Mostrar todas las insignias disponibles
  INSIGNIAS_DISPONIBLES.forEach(insignia => {
    const estaDesbloqueada = Estado.insignias.some(i => i.id === insignia.id);
    const div = document.createElement('div');
    div.className = `insignia-item ${estaDesbloqueada ? 'desbloqueada' : 'bloqueada'}`;
    div.innerHTML = `
      <div class="insignia-icono">${insignia.icono}</div>
      <div class="insignia-nombre">${insignia.nombre}</div>
      <div class="insignia-descripcion">${insignia.descripcion}</div>
    `;
    gridInsignias.appendChild(div);
  });
}

// ──────────────────────────────────────────────────────────
// FUNCIONES DE PAUSA
// ──────────────────────────────────────────────────────────
function togglePausa() {
  Estado.pausado = !Estado.pausado;

  if (Estado.pausado) {
    // Pausar el juego
    clearInterval(Estado.intervalo);
    const btn = document.getElementById('btn-pausa');
    btn.textContent = '▶️ Reanudar';
    
    // Mostrar pantalla de pausa
    document.getElementById('pausa-sala').textContent = `${Estado.salaActual + 1}/4`;
    document.getElementById('pausa-puntaje').textContent = Estado.puntaje;
    
    const min = String(Math.floor((Estado.tiempoTotal - Estado.tiempoTranscurrido) / 60)).padStart(2, '0');
    const seg = String((Estado.tiempoTotal - Estado.tiempoTranscurrido) % 60).padStart(2, '0');
    document.getElementById('pausa-tiempo').textContent = `${min}:${seg}`;
    
    mostrarPantalla('pantalla-pausa');
  } else {
    // Reanudar el juego
    const btn = document.getElementById('btn-pausa');
    btn.textContent = '⏸️ Pausa';
    
    mostrarPantalla('pantalla-juego');
    Estado.juegoActivo = true;
    iniciarTemporizador();
  }
}

function regresarAlInicio() {
  if (confirm('¿Estás seguro de que deseas abandonar el juego? Se perderá todo el progreso.')) {
    clearInterval(Estado.intervalo);
    Estado.juegoActivo = false;
    mostrarPantalla('pantalla-inicio');
  }
}

function terminarJuego(completado) {
  clearInterval(Estado.intervalo);
  Estado.juegoActivo = false;

  const tiempoEmpleado = Estado.tiempoTranscurrido;

  // Bono por tiempo restante (solo si completó el juego)
  if (completado) {
    const segundosRestantes = Estado.tiempoTotal - tiempoEmpleado;
    Estado.puntaje += Math.max(0, segundosRestantes) * BONO_POR_SEGUNDO;
  }

  const puntajeFinal = Math.max(0, Estado.puntaje);

  // Calcular insignias
  calcularInsignias();

  // Guardar progreso en shared/storage.js
  if (typeof actualizarJuego === 'function') {
    actualizarJuego('escapeRoom', puntajeFinal);
  }

  // Mostrar pantalla final
  mostrarPantallaFinal(puntajeFinal, tiempoEmpleado, completado);
}

function mostrarPantallaFinal(puntaje, segundos, completado) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  const tiempoStr = `${String(min).padStart(2,'0')}:${String(seg).padStart(2,'0')}`;

  document.getElementById('final-icono').textContent   = completado ? '🏆' : '⏰';
  document.getElementById('final-titulo').textContent  = completado ? '¡Escape completado!' : 'Tiempo agotado';
  document.getElementById('final-mensaje').textContent = completado
    ? `Superaste todas las salas del Escape Room Vial. ¡Excelente dominio del Código de Tránsito!`
    : `Se acabó el tiempo. Completaste ${Estado.salaActual + 1} sala(s). ¡Intenta de nuevo para mejorar!`;

  document.getElementById('final-puntaje').textContent = puntaje;
  document.getElementById('final-tiempo').textContent  = tiempoStr;
  document.getElementById('final-salas').textContent   = `${Estado.salaActual + (completado ? 1 : 0)}/4`;

  // Medalla según puntaje
  const { icono, texto } = calcularMedalla(puntaje, completado);
  document.getElementById('medalla-icono').textContent = icono;
  document.getElementById('medalla-texto').textContent = texto;

  // Mostrar insignias
  mostrarInsignias();

  mostrarPantalla('pantalla-final');

  // Cuenta regresiva para redirigir al hub
  let cuentaRegresiva = 5;
  const cuentaEl = document.getElementById('cuenta-regresiva');
  cuentaEl.textContent = cuentaRegresiva;
  const intervaloFinal = setInterval(() => {
    cuentaRegresiva--;
    cuentaEl.textContent = cuentaRegresiva;
    if (cuentaRegresiva <= 0) {
      clearInterval(intervaloFinal);
      window.location.href = '../index.html';
    }
  }, 1000);
}

function calcularMedalla(puntaje, completado) {
  if (!completado)        return { icono: '🎓', texto: 'Aprendiz Vial' };
  if (puntaje >= 1200)    return { icono: '🥇', texto: 'Inspector Vial Élite' };
  if (puntaje >= 900)     return { icono: '🥈', texto: 'Inspector Vial' };
  if (puntaje >= 600)     return { icono: '🥉', texto: 'Agente Vial' };
  return                        { icono: '🎖️', texto: 'Ciudadano Vial' };
}

// ──────────────────────────────────────────────────────────
// UTILIDADES DE UI
// ──────────────────────────────────────────────────────────
function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.getElementById(id).classList.add('activa');
  window.scrollTo(0, 0);
}

function mostrarFeedback(correcto, texto) {
  const el = document.getElementById('feedback-respuesta');
  el.className = `feedback ${correcto ? 'correcto' : 'incorrecto'}`;
  document.getElementById('feedback-icono').textContent = correcto ? '✅' : '❌';
  document.getElementById('feedback-texto').textContent = texto;
}

function ocultarFeedback() {
  document.getElementById('feedback-respuesta').className = 'feedback oculto';
}

function actualizarPuntajeHUD() {
  document.getElementById('hud-puntaje').textContent = Estado.puntaje;
}

function actualizarProgreso(acertijoIdx, total) {
  const porcentaje = Math.round((acertijoIdx / total) * 100);
  document.getElementById('progreso-fill').style.width  = porcentaje + '%';
  document.getElementById('progreso-label').textContent = `${acertijoIdx} / ${total} acertijos`;
}

// ──────────────────────────────────────────────────────────
// DATOS EMBEBIDOS DE RESPALDO
// (Se usan cuando no hay servidor HTTP local y fetch falla)
// Estos deben coincidir exactamente con los archivos JSON en /rooms/
// ──────────────────────────────────────────────────────────
const DATOS_EMBEBIDOS = [
  {
    "sala": "Sala 1 — Señales de Tránsito",
    "descripcion": "Debes descifrar las señales del Código Nacional de Tránsito para desbloquear la salida de esta sala.",
    "acertijos": [
      {
        "pregunta": "¿Qué indica una señal octagonal de color rojo con la palabra PARE?",
        "opciones": ["Ceder el paso a la derecha", "Detención obligatoria antes de la línea", "Reducir la velocidad a 30 km/h", "Solo aplica para vehículos pesados"],
        "correcta": 1,
        "pista": "Esta es la señal más importante del código. Se exige detención total antes de continuar.",
        "explicacion": "La señal octagonal roja PARE exige detención obligatoria antes de la línea de pare o la intersección."
      },
      {
        "pregunta": "¿Qué significa una señal triangular con borde rojo y vértice hacia abajo?",
        "opciones": ["Zona escolar", "Ceda el paso", "Velocidad máxima", "Curva peligrosa"],
        "correcta": 1,
        "pista": "Su forma de triángulo invertido es única entre las señales regulatorias.",
        "explicacion": "El triángulo invertido con borde rojo es la señal de Ceda el Paso: el conductor debe permitir el paso a los vehículos de la vía principal."
      },
      {
        "pregunta": "¿De qué color son las señales informativas en Colombia según el Manual de Señalización del INVIAS?",
        "opciones": ["Amarillo sobre negro", "Verde con letras blancas", "Azul con letras blancas", "Blanco con letras negras"],
        "correcta": 1,
        "pista": "Piensa en las señales de autopistas y carreteras principales que indican destinos.",
        "explicacion": "Las señales informativas de dirección y destino son de fondo verde con letras y orlas blancas, según el Manual de Señalización Vial del INVIAS."
      },
      {
        "pregunta": "Una señal circular con borde rojo y el número 30 en su interior indica:",
        "opciones": ["Velocidad mínima de 30 km/h", "Velocidad máxima permitida de 30 km/h", "Distancia de 30 metros a una zona peligrosa", "Número de vehículos máximos por carril"],
        "correcta": 1,
        "pista": "Las señales regulatorias circulares con borde rojo son restrictivas.",
        "explicacion": "Una señal circular con borde rojo y número interior es una restricción de velocidad máxima. El conductor no puede superar ese límite."
      }
    ],
    "tiempo_limite": 300
  },
  {
    "sala": "Sala 2 — Prioridad de Vía",
    "descripcion": "En esta sala debes demostrar que conoces las reglas de prelación y prioridad de paso establecidas en el Código Nacional de Tránsito colombiano.",
    "acertijos": [
      {
        "pregunta": "En una intersección sin señalización, ¿a quién se le debe ceder el paso?",
        "opciones": ["Al vehículo que viene más rápido", "Al vehículo que viene por la derecha", "Al vehículo que viene por la izquierda", "Al vehículo de mayor tamaño"],
        "correcta": 1,
        "pista": "El Código Nacional de Tránsito establece una regla cardinal para intersecciones no señalizadas.",
        "explicacion": "En intersecciones no señalizadas, el conductor debe ceder el paso al vehículo que se aproxima por su derecha (Art. 79, Ley 769 de 2002)."
      },
      {
        "pregunta": "¿Cuál es el orden correcto de prioridad de paso según el Código Nacional de Tránsito?",
        "opciones": [
          "Vehículos de emergencia → peatones → ciclistas → automóviles",
          "Peatones → ciclistas → vehículos de emergencia → automóviles",
          "Automóviles → ciclistas → peatones → vehículos de emergencia",
          "Ciclistas → peatones → automóviles → vehículos de emergencia"
        ],
        "correcta": 0,
        "pista": "Los vehículos con sirena y luces especiales siempre tienen la máxima prelación.",
        "explicacion": "La prelación de paso es: vehículos de emergencia (ambulancias, bomberos, policía), luego peatones, ciclistas y por último los demás vehículos."
      },
      {
        "pregunta": "Un peatón está cruzando por el paso cebra señalizado. El semáforo peatonal está en verde. ¿Qué debe hacer el conductor?",
        "opciones": [
          "Acelerar para cruzar antes de que termine el verde del peatón",
          "Pitar para advertir al peatón y luego avanzar",
          "Detener el vehículo y ceder el paso al peatón",
          "Rodear el paso cebra por el carril contiguo"
        ],
        "correcta": 2,
        "pista": "El paso cebra es inviolable: el peatón siempre tiene prioridad cuando está sobre él.",
        "explicacion": "El conductor debe detener el vehículo totalmente y esperar a que el peatón termine de cruzar. No se puede interrumpir su trayecto (Art. 76, Ley 769)."
      }
    ],
    "tiempo_limite": 300
  },
  {
    "sala": "Sala 3 — Normas para Motociclistas",
    "descripcion": "Yopal tiene uno de los parques de motocicletas más altos de Colombia. Esta sala te pone a prueba sobre las normas específicas para motociclistas del Código de Tránsito.",
    "acertijos": [
      {
        "pregunta": "¿Cuáles son los elementos de protección obligatorios para un motociclista en Colombia?",
        "opciones": [
          "Solo el casco homologado",
          "Casco, guantes y rodilleras",
          "Casco homologado, chaleco reflectivo y prendas de protección",
          "Casco y chaleco solo en horas nocturnas"
        ],
        "correcta": 2,
        "pista": "El chaleco reflectivo es obligatorio en todo momento, no solo de noche.",
        "explicacion": "Según el Decreto 1079 de 2015 y la Ley 769, el motociclista debe usar casco homologado, chaleco reflectivo con placa trasera y prendas de protección en todo momento."
      },
      {
        "pregunta": "¿Está permitido que dos motocicletas circulen en paralelo en el mismo carril en Colombia?",
        "opciones": [
          "Sí, siempre que ambas mantengan menos de 60 km/h",
          "Sí, solo en vías de doble carril",
          "No, está expresamente prohibido por el Código de Tránsito",
          "Sí, si hay autorización del tránsito municipal"
        ],
        "correcta": 2,
        "pista": "El zigzagueo y la circulación paralela son infracciones que ponen en riesgo la vida.",
        "explicacion": "El Art. 95 de la Ley 769 prohíbe expresamente que las motocicletas circulen en paralelo dentro del mismo carril."
      },
      {
        "pregunta": "¿A qué velocidad máxima puede circular una motocicleta en zona urbana en Colombia?",
        "opciones": ["80 km/h", "60 km/h", "50 km/h", "40 km/h"],
        "correcta": 1,
        "pista": "Este límite aplica para todos los vehículos automotores en zona urbana, salvo señalización específica.",
        "explicacion": "En zona urbana la velocidad máxima es 60 km/h para vehículos automotores, incluidas las motocicletas (Art. 106, Ley 769 de 2002)."
      },
      {
        "pregunta": "¿Cuántos pasajeros puede transportar una motocicleta legalmente en Colombia?",
        "opciones": [
          "Ninguno, las motos no pueden llevar pasajero",
          "Solo uno, en asiento trasero diseñado para ello",
          "Hasta dos, si la moto tiene más de 150 cc",
          "Hasta dos, sin restricción de cilindraje"
        ],
        "correcta": 1,
        "pista": "El acompañante debe usar casco y ir en el puesto trasero oficial del vehículo.",
        "explicacion": "La motocicleta puede llevar solo un pasajero adicional, ubicado en el asiento trasero diseñado para ello, y debe usar casco homologado."
      }
    ],
    "tiempo_limite": 300
  },
  {
    "sala": "Sala 4 — Situaciones de Emergencia",
    "descripcion": "Esta sala final evalúa tu capacidad de tomar decisiones correctas ante situaciones de riesgo vial. Demuestra que sabes actuar en emergencias.",
    "acertijos": [
      {
        "pregunta": "Al acercarse una ambulancia con sirena y luces encendidas, ¿qué debe hacer el conductor?",
        "opciones": [
          "Acelerar y adelantarse para despejarse del camino rápidamente",
          "Frenar de golpe en el lugar donde se encuentra",
          "Desplazarse lo más posible hacia el borde derecho de la vía y detenerse",
          "Seguir la ambulancia para aprovechar el carril despejado"
        ],
        "correcta": 2,
        "pista": "Nunca frenes de golpe: el vehículo de atrás puede impactarte. Muévete al borde.",
        "explicacion": "El conductor debe desplazarse al borde derecho de la vía y detenerse, dejando libre la mayor parte posible del carril para el vehículo de emergencia."
      },
      {
        "pregunta": "¿Cuándo se deben usar las luces de emergencia (cuatro direccionales) del vehículo?",
        "opciones": [
          "Para estacionar en cualquier lugar de forma temporal",
          "Solo cuando el vehículo está detenido por una avería o situación de peligro",
          "Cuando llueve con intensidad en carretera",
          "Cuando se pasa por un túnel"
        ],
        "correcta": 1,
        "pista": "Las direccionales simultáneas son una señal de peligro, no un permiso para estacionar.",
        "explicacion": "Las luces de emergencia (cuatro direccionales) deben usarse únicamente cuando el vehículo presenta una avería o está en una situación de peligro que obliga a detenerse."
      },
      {
        "pregunta": "En un accidente de tránsito, ¿cuál es la primera acción correcta?",
        "opciones": [
          "Mover a los heridos para sacarlos de peligro inmediato",
          "Tomar fotos y publicarlas en redes sociales para informar",
          "Asegurar la escena, llamar al 123 y no mover a los heridos salvo peligro inminente",
          "Tratar de reparar el daño entre las partes para evitar reportes"
        ],
        "correcta": 2,
        "pista": "Mover a un herido sin capacitación puede agravar lesiones de columna.",
        "explicacion": "Se debe asegurar la escena del accidente (señalizar), llamar al 123 (emergencias) y no mover a los heridos a menos que haya peligro inminente de incendio o similar."
      },
      {
        "pregunta": "¿Qué se debe hacer si los frenos fallan mientras se conduce en descenso?",
        "opciones": [
          "Apagar el motor inmediatamente",
          "Usar el freno de mano, reducir marchas y buscar una superficie de fricción",
          "Abrir la puerta para bajar la velocidad por aire",
          "Acelerar para ganar control del vehículo"
        ],
        "correcta": 1,
        "pista": "La reducción de marchas aprovecha el freno motor para bajar velocidad progresivamente.",
        "explicacion": "Ante falla de frenos en descenso: usar el freno de mano paulatinamente, reducir marchas para aprovechar el freno motor, y dirigirse hacia una zona de contención (talud, zona de escape) si existe."
      }
    ],
    "tiempo_limite": 300
  }
];