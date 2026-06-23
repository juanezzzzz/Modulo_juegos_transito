/* ═══════════════════════════════════════════════
   shared/storage.js — Módulo de Progreso Compartido
   Proyecto SMVI | Yopal, Casanare | 2025
   Todos los juegos deben importar este archivo
   y usar estas funciones al terminar la partida.
═══════════════════════════════════════════════ */

function leerProgreso() {
  return JSON.parse(localStorage.getItem('smvi_progreso')) || {};
}

function guardarProgreso(data) {
  localStorage.setItem('smvi_progreso', JSON.stringify(data));
}

function actualizarJuego(clave, puntaje) {
  const progreso = leerProgreso();
  progreso[clave] = { completado: true, puntaje: puntaje };
  guardarProgreso(progreso);
}

function reiniciarProgreso() {
  localStorage.removeItem('smvi_progreso');
}