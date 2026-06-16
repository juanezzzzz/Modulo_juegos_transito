let preguntas = [];
let indice = 0;

let aciertos = 0;
let errores = 0;

let tiempo = 30;
let intervalo;

const preguntaHTML = document.getElementById("pregunta");
const botones = document.querySelectorAll(".opcion");
const explicacionHTML = document.getElementById("explicacion");
const temporizadorHTML = document.getElementById("temporizador");
const barraTiempo = document.getElementById("barraTiempo");

fetch("preguntas.json")
.then(res => res.json())
.then(data => {

    preguntas = data;

    cargarPregunta();

});

function cargarPregunta(){

    limpiarBotones();

    const actual = preguntas[indice];

    preguntaHTML.textContent = actual.pregunta;

    botones.forEach((btn,i)=>{

        btn.textContent = actual.opciones[i];

        btn.disabled = false;

        btn.onclick = () => responder(i);
    });

    iniciarCronometro();
}

function iniciarCronometro(){

    clearInterval(intervalo);

    tiempo = 30;

    temporizadorHTML.textContent = tiempo;

    barraTiempo.style.width = "100%";

    intervalo = setInterval(()=>{

        tiempo--;

        temporizadorHTML.textContent = tiempo;

        barraTiempo.style.width =
        (tiempo/30*100) + "%";

        if(tiempo <= 0){

            clearInterval(intervalo);

            errores++;

            mostrarExplicacion(false,null);
        }

    },1000);
}

function responder(opcion){

    clearInterval(intervalo);

    const actual = preguntas[indice];

    botones.forEach(btn => btn.disabled = true);

    if(opcion === actual.correcta){

        aciertos++;

        botones[opcion].classList.add("correcta");

        mostrarExplicacion(true,actual);

    }else{

        errores++;

        botones[opcion].classList.add("incorrecta");

        botones[actual.correcta].classList.add("correcta");

        mostrarExplicacion(false,actual);
    }
}

function mostrarExplicacion(acerto,pregunta){

    if(pregunta){

        explicacionHTML.innerHTML =
        (acerto ? "✅ Correcto<br>" : "❌ Incorrecto<br>")
        + pregunta.explicacion;

    }else{

        explicacionHTML.innerHTML =
        "⏰ Tiempo agotado";
    }

    setTimeout(()=>{

        indice++;

        explicacionHTML.innerHTML="";

        if(indice < preguntas.length){

            cargarPregunta();

        }else{

            finalizarJuego();
        }

    },2000);
}

function finalizarJuego(){

    actualizarjuego("trivia", aciertos);

    document.querySelector(".pregunta").style.display="none";

    document.querySelector(".opciones").style.display="none";

    document.querySelector(".barra-container").style.display="none";

    document.getElementById("temporizador").style.display="none";

    document.getElementById("resultado")
    .classList.remove("oculto");

    document.getElementById("puntaje").innerHTML = `
        Aciertos: ${aciertos}<br>
        Errores: ${errores}<br>
        Puntaje: ${aciertos}
    `;

    if(typeof actualizarJuego === "function"){

        actualizarJuego("trivia", aciertos);
    }
}

document.getElementById("finalizar")
.addEventListener("click",()=>{

    window.location.href="../index.html";
});

function limpiarBotones(){

    botones.forEach(btn=>{

        btn.classList.remove(
            "correcta",
            "incorrecta"
        );
    });
}