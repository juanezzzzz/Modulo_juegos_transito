/* =================================================
   shared/storage.js — Módulo de Almacenamiento SMVI
   Seguridad Vial Yopal, Casanare
   Usado por: todos los juegos del ecosistema
   ================================================= */

'use strict';

const STORAGE_KEY = 'smvi_progreso';

/**
 * Lee el objeto de progreso completo desde localStorage.
 * @returns {Object} progreso — { detector, trivia, motociclista, escapeRoom }
 */
function leerProgreso() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    console.warn('[SMVI Storage] No se pudo leer el progreso:', e);
    return {};
  }
}

/**
 * Guarda el objeto de progreso completo en localStorage.
 * @param {Object} data
 */
function guardarProgreso(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[SMVI Storage] No se pudo guardar el progreso:', e);
  }
}

/**
 * Actualiza el resultado de un juego específico.
 * Solo sobreescribe si el nuevo puntaje es mayor (guarda el mejor intento).
 * @param {string} clave     — 'detector' | 'trivia' | 'motociclista' | 'escapeRoom'
 * @param {number} puntaje   — puntaje obtenido en esta partida
 */
function actualizarJuego(clave, puntaje) {
  const progreso = leerProgreso();
  const anterior = progreso[clave];

  // Guardar solo si es el primer intento o si supera el récord anterior
  if (!anterior || puntaje > anterior.puntaje) {
    progreso[clave] = {
      completado: true,
      puntaje,
      fecha: new Date().toISOString()
    };
    guardarProgreso(progreso);
    console.info(`[SMVI Storage] "${clave}" actualizado — puntaje: ${puntaje}`);
  } else {
    // Marcar como completado aunque no mejore el puntaje
    progreso[clave].completado = true;
    guardarProgreso(progreso);
    console.info(`[SMVI Storage] "${clave}" completado — récord anterior (${anterior.puntaje}) conservado.`);
  }
}

/**
 * Devuelve el progreso de un juego específico, o null si no existe.
 * @param {string} clave
 * @returns {{ completado: boolean, puntaje: number, fecha: string } | null}
 */
function leerJuego(clave) {
  const progreso = leerProgreso();
  return progreso[clave] || null;
}

/**
 * Calcula el puntaje total acumulado de todos los juegos completados.
 * @returns {number}
 */
function puntajeTotal() {
  const progreso = leerProgreso();
  return Object.values(progreso).reduce((suma, j) => {
    return j && j.completado ? suma + (j.puntaje || 0) : suma;
  }, 0);
}

/**
 * Calcula cuántos juegos han sido completados.
 * @returns {number}
 */
function juegosCompletados() {
  const progreso = leerProgreso();
  return Object.values(progreso).filter(j => j && j.completado).length;
}

/**
 * Borra todo el progreso guardado (útil para el botón "Reiniciar" del Hub).
 */
function reiniciarProgreso() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.info('[SMVI Storage] Progreso reiniciado.');
  } catch (e) {
    console.warn('[SMVI Storage] No se pudo reiniciar el progreso:', e);
  }
}