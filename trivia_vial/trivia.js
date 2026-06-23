/* =================================================
   trivia.js — Trivia Vial SMVI
   Seguridad Vial Yopal, Casanare
   Responsable: Kevin
   ================================================= */

'use strict';

// ─── Compatibilidad con shared/storage.js ────────────────────────────────────
// Si el hub no está disponible (prueba local), se define un stub para no romper.
if (typeof actualizarJuego === 'undefined') {
  window.actualizarJuego = function(clave, puntaje) {
    try {
      const progreso = JSON.parse(localStorage.getItem('smvi_progreso')) || {};
      progreso[clave] = { completado: true, puntaje };
      localStorage.setItem('smvi_progreso', JSON.stringify(progreso));
    } catch (e) { /* localStorage no disponible */ }
  };
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const TIEMPO_POR_PREGUNTA = 30;   // segundos
const PUNTOS_POR_ACIERTO  = 10;
const LETRAS = ['A', 'B', 'C', 'D'];
const HUB_URL = '../index.html';

// ─── Estado global ───────────────────────────────────────────────────────────
let preguntas     = [];   // array completo cargado del JSON
let orden         = [];   // índices mezclados
let indiceCurrent = 0;    // posición en 'orden'
let aciertos      = 0;
let errores       = 0;
let puntaje       = 0;
let intervalo     = null; // referencia al setInterval del cronómetro
let tiempoRestante = TIEMPO_POR_PREGUNTA;
let respondida    = false; // evita doble clic
let opcionesOrden      = [];   // índices mezclados de las opciones de la pregunta actual
let historialCorrectas = [];   // posiciones en pantalla de las últimas 2 respuestas correctas

// ─── Referencias al DOM ──────────────────────────────────────────────────────
const pantallaInicio     = document.getElementById('pantalla-inicio');
const pantallaJuego      = document.getElementById('pantalla-juego');
const pantallaResultados = document.getElementById('pantalla-resultados');

const btnIniciar    = document.getElementById('btn-iniciar');
const btnHub        = document.getElementById('btn-hub');
const btnReiniciar  = document.getElementById('btn-reiniciar');

const progresoTexto  = document.getElementById('progreso-texto');
const barraProgFill  = document.getElementById('barra-progreso-fill');
const cronometroNum  = document.getElementById('cronometro-numero');
const barraTimeFill  = document.getElementById('barra-tiempo-fill');
const preguntaNumero = document.getElementById('pregunta-numero');
const textoPregunta  = document.getElementById('texto-pregunta');
const opcionesGrid   = document.getElementById('opciones-grid');
const explicacionBox = document.getElementById('explicacion-box');
const msAciertos     = document.getElementById('ms-aciertos');
const msErrores      = document.getElementById('ms-errores');

// Resultados
const resPuntaje  = document.getElementById('res-puntaje');
const resAciertos = document.getElementById('res-aciertos');
const resErrores  = document.getElementById('res-errores');
const resPct      = document.getElementById('res-pct');
const pctFill     = document.getElementById('pct-barra-fill');
const resIcono    = document.getElementById('resultado-icono');
const resTitulo   = document.getElementById('resultado-titulo');
const resMensaje  = document.getElementById('resultado-mensaje');

// ─── Carga del JSON ──────────────────────────────────────────────────────────
async function cargarPreguntas() {
  try {
    const resp = await fetch('preguntas.json');
    if (!resp.ok) throw new Error('No se pudo cargar preguntas.json');
    preguntas = await resp.json();
    document.getElementById('stat-total').textContent = preguntas.length;
  } catch (err) {
    console.error(err);
    alert('Error al cargar las preguntas. Asegúrate de abrir el proyecto desde un servidor local (Live Server).');
  }
}

// ─── Mezcla de Fisher-Yates ───────────────────────────────────────────────────
function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Inicio del juego ────────────────────────────────────────────────────────
function iniciarJuego() {
  if (!preguntas.length) {
    alert('Las preguntas aún no han cargado. Espera un momento.');
    return;
  }

  // Resetear estado
  indiceCurrent      = 0;
  aciertos           = 0;
  errores            = 0;
  puntaje            = 0;
  historialCorrectas = [];
  orden              = mezclar(preguntas.map((_, i) => i));

  // Resetear mini marcador
  msAciertos.textContent = '0';
  msErrores.textContent  = '0';

  // Cambiar pantallas
  pantallaInicio.style.display     = 'none';
  pantallaResultados.style.display = 'none';
  pantallaJuego.style.display      = 'block';

  cargarPregunta();
}

// ─── Cargar una pregunta ─────────────────────────────────────────────────────
function cargarPregunta() {
  respondida = false;
  explicacionBox.textContent = '';
  explicacionBox.classList.remove('visible');

  const total = orden.length;
  const num   = indiceCurrent + 1;
  const pregObj = preguntas[orden[indiceCurrent]];

  // Progreso
  progresoTexto.textContent         = `${num} / ${total}`;
  barraProgFill.style.width         = `${((num - 1) / total) * 100}%`;
  preguntaNumero.textContent        = `Pregunta ${num}`;
  textoPregunta.textContent         = pregObj.pregunta;

  // Mezclar opciones con restricción: la correcta no puede caer 3 veces seguidas
  // en la misma posición de pantalla.
  const posicionCorrecta = pregObj.correcta; // índice original de la correcta
  let intentos = 0;
  do {
    opcionesOrden = mezclar([0, 1, 2, 3]);
    // posEnPantalla: posición visible (0=A,1=B,2=C,3=D) donde quedó la correcta
    const posEnPantalla = opcionesOrden.indexOf(posicionCorrecta);
    // Solo rechazar si las 2 últimas también tuvieron la correcta en esa misma posición
    const bloqueada = historialCorrectas.length === 2 &&
                      historialCorrectas[0] === posEnPantalla &&
                      historialCorrectas[1] === posEnPantalla;
    if (!bloqueada) break;
    intentos++;
  } while (intentos < 20); // fallback: tras 20 intentos acepta cualquier resultado

  // Registrar la posición visible de la correcta en el historial (máx. 2 entradas)
  const posCorrecta = opcionesOrden.indexOf(pregObj.correcta);
  historialCorrectas.push(posCorrecta);
  if (historialCorrectas.length > 2) historialCorrectas.shift();

  // Opciones
  const botones = opcionesGrid.querySelectorAll('.btn-opcion');
  botones.forEach((btn, i) => {
    const idxOriginal = opcionesOrden[i];
    btn.querySelector('.letra').textContent        = LETRAS[i];
    btn.querySelector('.texto-opcion').textContent = pregObj.opciones[idxOriginal];
    btn.className = 'btn-opcion';
    btn.disabled  = false;
  });

  iniciarCronometro();
}

// ─── Cronómetro ──────────────────────────────────────────────────────────────
function iniciarCronometro() {
  detenerCronometro();
  tiempoRestante = TIEMPO_POR_PREGUNTA;
  actualizarVisualesCronometro();

  intervalo = setInterval(() => {
    tiempoRestante--;
    actualizarVisualesCronometro();

    if (tiempoRestante <= 0) {
      detenerCronometro();
      tiempoAgotado();
    }
  }, 1000);
}

function detenerCronometro() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}

function actualizarVisualesCronometro() {
  const pct = (tiempoRestante / TIEMPO_POR_PREGUNTA) * 100;
  cronometroNum.textContent        = tiempoRestante;
  barraTimeFill.style.width        = `${pct}%`;

  const urgente = tiempoRestante <= 10;
  cronometroNum.classList.toggle('urgente', urgente);
  barraTimeFill.classList.toggle('urgente', urgente);
}

// ─── Tiempo agotado ───────────────────────────────────────────────────────────
function tiempoAgotado() {
  if (respondida) return;
  respondida = true;

  const pregObj = preguntas[orden[indiceCurrent]];
  const botones = opcionesGrid.querySelectorAll('.btn-opcion');

  // Marcar la correcta en verde; deshabilitar todas
  botones.forEach((btn, i) => {
    btn.disabled = true;
    if (opcionesOrden[i] === pregObj.correcta) btn.classList.add('correcto');
  });

  errores++;
  msErrores.textContent = errores;

  mostrarExplicacion(pregObj.explicacion, '⏱️ ¡Tiempo agotado! ');
  programarSiguiente();
}

// ─── Evaluar respuesta ────────────────────────────────────────────────────────
function evaluarRespuesta(idxSeleccionado) {
  if (respondida) return;
  respondida = true;
  detenerCronometro();

  const pregObj = preguntas[orden[indiceCurrent]];
  const botones = opcionesGrid.querySelectorAll('.btn-opcion');
  // idxSeleccionado es la posición en pantalla; comparar con el índice original
  const esCorrecta = opcionesOrden[idxSeleccionado] === pregObj.correcta;

  botones.forEach((btn, i) => {
    btn.disabled = true;
    if (opcionesOrden[i] === pregObj.correcta) btn.classList.add('correcto');
    if (i === idxSeleccionado && !esCorrecta)  btn.classList.add('incorrecto');
  });

  if (esCorrecta) {
    aciertos++;
    puntaje += PUNTOS_POR_ACIERTO;
    msAciertos.textContent = aciertos;
    mostrarExplicacion(pregObj.explicacion, '✅ ¡Correcto! ');
  } else {
    errores++;
    msErrores.textContent = errores;
    mostrarExplicacion(pregObj.explicacion, '❌ Incorrecto. ');
  }

  programarSiguiente();
}

// ─── Mostrar explicación ──────────────────────────────────────────────────────
function mostrarExplicacion(texto, prefijo) {
  explicacionBox.textContent = prefijo + texto;
  explicacionBox.classList.add('visible');
}

// ─── Programar siguiente pregunta ────────────────────────────────────────────
function programarSiguiente() {
  setTimeout(() => {
    indiceCurrent++;
    if (indiceCurrent < orden.length) {
      cargarPregunta();
    } else {
      finalizarJuego();
    }
  }, 2200);
}

// ─── Finalizar juego ─────────────────────────────────────────────────────────
function finalizarJuego() {
  detenerCronometro();

  // Guardar en shared/storage.js (o el stub local)
  actualizarJuego('trivia', puntaje);

  const total = orden.length;
  const pct   = Math.round((aciertos / total) * 100);

  // Llenar pantalla de resultados
  resPuntaje.textContent  = puntaje;
  resAciertos.textContent = aciertos;
  resErrores.textContent  = errores;
  resPct.textContent      = `${pct}%`;

  // Animar barra (pequeño delay para que el navegador renderice primero)
  setTimeout(() => { pctFill.style.width = `${pct}%`; }, 80);

  // Mensaje según desempeño
  let icono, titulo, mensaje;
  if (pct >= 90) {
    icono   = '🏆';
    titulo  = '¡Experto Vial!';
    mensaje = `Obtuviste ${puntaje} puntos. Dominas el Código Nacional de Tránsito. ¡Las calles de Yopal necesitan conductores como tú!`;
  } else if (pct >= 70) {
    icono   = '🥈';
    titulo  = '¡Muy bien!';
    mensaje = `Obtuviste ${puntaje} puntos. Buen manejo de las normas viales. Repasa los temas donde fallaste y vuelve a intentarlo.`;
  } else if (pct >= 50) {
    icono   = '🚧';
    titulo  = 'Puedes mejorar';
    mensaje = `Obtuviste ${puntaje} puntos. Conoces algunas normas, pero aún hay temas por reforzar. ¡Sigue practicando!`;
  } else {
    icono   = '📖';
    titulo  = '¡A estudiar!';
    mensaje = `Obtuviste ${puntaje} puntos. Te recomendamos revisar el Código Nacional de Tránsito (Ley 769 de 2002) antes de volver a intentarlo.`;
  }

  resIcono.textContent   = icono;
  resTitulo.textContent  = titulo;
  resMensaje.textContent = mensaje;

  // Mostrar pantalla de resultados
  pantallaJuego.style.display      = 'none';
  pantallaResultados.style.display = 'block';
}

// ─── Event listeners ─────────────────────────────────────────────────────────
btnIniciar.addEventListener('click', iniciarJuego);

btnReiniciar.addEventListener('click', () => {
  pantallaResultados.style.display = 'none';
  pantallaInicio.style.display     = 'block';
});

btnHub.addEventListener('click', () => {
  window.location.href = HUB_URL;
});

// Delegar clic en las opciones (un solo listener para los 4 botones)
opcionesGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-opcion');
  if (!btn || btn.disabled) return;
  evaluarRespuesta(parseInt(btn.dataset.idx, 10));
});

// ─── Arranque ────────────────────────────────────────────────────────────────
cargarPreguntas();