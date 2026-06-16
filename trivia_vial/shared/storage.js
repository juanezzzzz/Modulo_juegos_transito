const STORAGE_KEY = "yopalvial_progreso";

function obtenerProgreso() {
    return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    ) || {};
}

function actualizarJuego(nombreJuego, puntaje) {

    const progreso = obtenerProgreso();

    progreso[nombreJuego] = {
        puntaje,
        fecha: new Date().toISOString()
    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(progreso)
    );
}

function obtenerPuntaje(nombreJuego) {

    const progreso = obtenerProgreso();

    return progreso[nombreJuego]?.puntaje || 0;
}

function reiniciarProgreso() {
    localStorage.removeItem(STORAGE_KEY);
}