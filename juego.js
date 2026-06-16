// ============================================
// DATOS Y CONFIGURACIÓN
// ============================================

const WORDS = ['CASCO', 'CHALECO', 'PARE', 'PEATON', 'CEBRA', 'SEMAFORO', 'CASANARE', 'YOPAL', 'VIAJERO', 'PRUDENCIA'];

const MESSAGES = {
    CASCO: {
        message: "¡Carajo, bien visto, pariente! El casco salva vidas en las calles de Yopal. ¡Úsalo siempre abrochado!",
        tip: "Un casco bien ajustado puede salvarte la vida en cualquier momento."
    },
    CHALECO: {
        message: "¡Eso sí! El chaleco reflectivo te hace visible en la noche. ¡Que te vean, compa!",
        tip: "En las noches llaneras, la visibilidad es fundamental para tu seguridad."
    },
    PARE: {
        message: "¡Sostenga el caballo, pariente! Ante un PARE, deténgase por completo y evite accidentes.",
        tip: "Un PARE no es sugerencia, es ley. Respétalo siempre, sin excepciones."
    },
    PEATON: {
        message: "¡El peatón es el rey de la vía! Respeta al que va a pie, que él también tiene derecho.",
        tip: "Los peatones son vulnerables. Reduce la velocidad cuando veas personas."
    },
    CEBRA: {
        message: "La CEBRA es el paso seguro. Cruza ahí, no en cualquier parte de la vía, compa.",
        tip: "Las cebras existen para que cruces seguro. Úsalas siempre."
    },
    SEMAFORO: {
        message: "¡Respeta el SEMÁFORO, guía! La luz verde te da paso, la roja te ordena parar.",
        tip: "Los semáforos coordinan el tráfico. No hay prisa que valga romper la ley."
    },
    CASANARE: {
        message: "¡Somos CASANARE, tierra de llaneros! Aquí la seguridad es cultura, no moda.",
        tip: "En Casanare tenemos que ser ejemplo de conductores responsables."
    },
    YOPAL: {
        message: "¡YOPAL, corazón del llano! En esta capital, cada conductor cuida al otro.",
        tip: "Yopal crece, y con ello crece nuestra responsabilidad vial."
    },
    VIAJERO: {
        message: "Todo VIAJERO debe conocer las reglas. En la ruta, la prudencia es tu compañía.",
        tip: "Antes de viajar, revisa tu vehículo y mantén la calma."
    },
    PRUDENCIA: {
        message: "¡La PRUDENCIA es la mejor compañera del conductor llanero! Con ella, llegas seguro.",
        tip: "La prisa mata. La prudencia salva. Elige siempre la vida."
    }
};

// ============================================
// ESTADO DEL JUEGO
// ============================================

let gameState = {
    puzzle: [],
    wordLocations: {},
    foundWords: new Set(),
    selectedLetters: [],
    gameStarted: false
};

// ============================================
// GENERADOR DE SOPA DE LETRAS
// ============================================

function generatePuzzle() {
    const width = 14;
    const height = 14;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Inicializar puzzle vacío
    gameState.puzzle = Array(height).fill(null).map(() => 
        Array(width).fill('X')
    );
    
    gameState.wordLocations = {};
    
    const directions = [
        {x: 1, y: 0},   // Derecha
        {x: 0, y: 1},   // Abajo
        {x: 1, y: 1},   // Diagonal abajo-derecha
        {x: 1, y: -1},  // Diagonal arriba-derecha
        {x: -1, y: 0},  // Izquierda
        {x: 0, y: -1},  // Arriba
        {x: -1, y: -1}, // Diagonal arriba-izquierda
        {x: -1, y: 1}   // Diagonal abajo-izquierda
    ];

    // Colocar palabras
    for (const word of WORDS) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 200) {
            const startRow = Math.floor(Math.random() * height);
            const startCol = Math.floor(Math.random() * width);
            const direction = directions[Math.floor(Math.random() * directions.length)];
            
            if (canPlaceWord(word, startRow, startCol, direction, width, height)) {
                placeWord(word, startRow, startCol, direction);
                gameState.wordLocations[word] = {
                    startRow, startCol, direction, word
                };
                placed = true;
            }
            attempts++;
        }
    }

    // Llenar espacios vacíos con letras aleatorias
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (gameState.puzzle[row][col] === 'X') {
                gameState.puzzle[row][col] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }
}

function canPlaceWord(word, startRow, startCol, direction, width, height) {
    for (let i = 0; i < word.length; i++) {
        const row = startRow + (direction.y * i);
        const col = startCol + (direction.x * i);
        
        if (row < 0 || row >= height || col < 0 || col >= width) {
            return false;
        }
        
        const cell = gameState.puzzle[row][col];
        if (cell !== 'X' && cell !== word[i]) {
            return false;
        }
    }
    return true;
}

function placeWord(word, startRow, startCol, direction) {
    for (let i = 0; i < word.length; i++) {
        const row = startRow + (direction.y * i);
        const col = startCol + (direction.x * i);
        gameState.puzzle[row][col] = word[i];
    }
}

// ============================================
// RENDERIZADO
// ============================================

function renderPuzzle() {
    const puzzleEl = document.getElementById('puzzle');
    puzzleEl.innerHTML = '';

    gameState.puzzle.forEach((row, rowIndex) => {
        row.forEach((letter, colIndex) => {
            const btn = document.createElement('button');
            btn.className = 'letter-btn';
            btn.textContent = letter;
            btn.dataset.row = rowIndex;
            btn.dataset.col = colIndex;
            btn.id = `cell-${rowIndex}-${colIndex}`;
            btn.onclick = (e) => handleLetterClick(e, rowIndex, colIndex);
            puzzleEl.appendChild(btn);
        });
    });
}

function renderWordList() {
    const wordListEl = document.getElementById('wordList');
    wordListEl.innerHTML = '';

    WORDS.forEach(word => {
        const div = document.createElement('div');
        div.className = 'word-item';
        div.id = `word-${word}`;
        div.textContent = word;
        wordListEl.appendChild(div);
    });
}

// ============================================
// INTERACCIÓN DEL USUARIO
// ============================================

function handleLetterClick(e, rowIndex, colIndex) {
    const btn = e.target;
    const key = `${rowIndex}-${colIndex}`;

    if (gameState.selectedLetters.includes(key)) {
        gameState.selectedLetters = gameState.selectedLetters.filter(k => k !== key);
        btn.classList.remove('selected');
    } else {
        gameState.selectedLetters.push(key);
        btn.classList.add('selected');
    }

    checkForWord();
}

function checkForWord() {
    if (gameState.selectedLetters.length < 3) return;

    const selectedText = gameState.selectedLetters
        .map(key => {
            const [row, col] = key.split('-');
            return gameState.puzzle[row][col];
        }).join('');

    const reverseText = selectedText.split('').reverse().join('');

    for (const word of WORDS) {
        if (!gameState.foundWords.has(word)) {
            if (selectedText === word || reverseText === word) {
                markWordFound(word);
                return;
            }
        }
    }
}

// ============================================
// LÓGICA DE PALABRAS ENCONTRADAS
// ============================================

function markWordFound(word) {
    gameState.foundWords.add(word);
    gameState.selectedLetters = [];

    // Limpiar selección visual
    document.querySelectorAll('.letter-btn.selected').forEach(btn => btn.classList.remove('selected'));

    // Marcar las letras encontradas
    const wordLoc = gameState.wordLocations[word];
    if (wordLoc) {
        for (let i = 0; i < word.length; i++) {
            const row = wordLoc.startRow + (wordLoc.direction.y * i);
            const col = wordLoc.startCol + (wordLoc.direction.x * i);
            const cell = document.getElementById(`cell-${row}-${col}`);
            if (cell) {
                cell.classList.add('found');
            }
        }
    }

    // Marcar en la lista
    const wordEl = document.getElementById(`word-${word}`);
    if (wordEl) {
        wordEl.classList.add('found');
    }

    updateProgress();
    showMessageForWord(word);

    if (gameState.foundWords.size === WORDS.length) {
        setTimeout(showCompletionMessage, 800);
    }
}

function updateProgress() {
    const progress = (gameState.foundWords.size / WORDS.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('foundCount').textContent = gameState.foundWords.size;
}

// ============================================
// MODALES Y MENSAJES
// ============================================

function showMessageForWord(word) {
    const messageData = MESSAGES[word];
    document.getElementById('modalWord').textContent = word;
    document.getElementById('modalMessage').textContent = messageData.message;
    document.getElementById('modalTip').textContent = '💡 ' + messageData.tip;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function showCompletionMessage() {
    document.getElementById('completionMessage').classList.add('active');
}

// ============================================
// CONTROLES DEL JUEGO
// ============================================

function resetGame() {
    gameState.foundWords.clear();
    gameState.selectedLetters = [];
    document.querySelectorAll('.letter-btn.selected, .letter-btn.found').forEach(btn => {
        btn.classList.remove('selected', 'found');
    });
    generatePuzzle();
    renderPuzzle();
    renderWordList();
    updateProgress();
    document.getElementById('completionMessage').classList.remove('active');
}

function showHint() {
    const notFound = WORDS.filter(w => !gameState.foundWords.has(w));
    if (notFound.length === 0) {
        alert('¡Ya encontraste todas las palabras, campeón! 🎉');
        return;
    }

    const hint = notFound[Math.floor(Math.random() * notFound.length)];
    const hintLoc = gameState.wordLocations[hint];
    alert(`🔍 Pista: Busca "${hint}"\n\nPosición: Fila ${hintLoc.startRow + 1}, Columna ${hintLoc.startCol + 1}`);
}

// ============================================
// INICIALIZAR JUEGO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando juego...');
    generatePuzzle();
    renderPuzzle();
    renderWordList();
    updateProgress();
    gameState.gameStarted = true;
    console.log('¡Juego listo!');
});
