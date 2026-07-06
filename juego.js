const WORDS = ['CASCO', 'CHALECO', 'PARE', 'PEATON', 'CEBRA', 'SEMAFORO', 'CASANARE', 'YOPAL', 'VIAJERO', 'PRUDENCIA'];

const MESSAGES = {
    CASCO: { message: "¡Carajo, bien visto, pariente! El casco salva vidas en las calles de Yopal. ¡Úsalo siempre abrochado!", tip: "Un casco bien ajustado puede salvarte la vida en cualquier momento." },
    CHALECO: { message: "¡Eso sí! El chaleco reflectivo te hace visible en la noche. ¡Que te vean, compa!", tip: "En las noches llaneras, la visibilidad es fundamental para tu seguridad." },
    PARE: { message: "¡Sostenga el caballo, pariente! Ante un PARE, deténgase por completo y evite accidentes.", tip: "Un PARE no es sugerencia, es ley. Respétalo siempre, sin excepciones." },
    PEATON: { message: "¡El peatón es el rey de la vía! Respeta al que va a pie, que él también tiene derecho.", tip: "Los peatones son vulnerables. Reduce la velocidad cuando veas personas." },
    CEBRA: { message: "La CEBRA es el paso seguro. Cruza ahí, no en cualquier parte de la vía, compa.", tip: "Las cebras existen para que cruces seguro. Úsalas siempre." },
    SEMAFORO: { message: "¡Respeta el SEMÁFORO, guía! La luz verde te da paso, la roja te ordena parar.", tip: "Los semáforos coordinan el tráfico. No hay prisa que valga romper la ley." },
    CASANARE: { message: "¡Somos CASANARE, tierra de llaneros! Aquí la seguridad es cultura, no moda.", tip: "En Casanare tenemos que ser ejemplo de conductores responsables." },
    YOPAL: { message: "¡YOPAL, corazón del llano! En esta capital, cada conductor cuida al otro.", tip: "Yopal crece, y con ello crece nuestra responsabilidad vial." },
    VIAJERO: { message: "Todo VIAJERO debe conocer las reglas. En la ruta, la prudencia es tu compañía.", tip: "Antes de viajar, revisa tu vehículo y mantén la calma." },
    PRUDENCIA: { message: "¡La PRUDENCIA es la mejor compañera del conductor llanero! Con ella, llegas seguro.", tip: "La prisa mata. La prudencia salva. Elige siempre la vida." }
};

let gameState = {
    puzzle: [],
    wordLocations: {},
    foundWords: new Set(),
    selectedLetters: [],
    gameStarted: false,
    isSelecting: false
};

function generatePuzzle() {
    const width = 14;
    const height = 14;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    gameState.puzzle = Array(height).fill(null).map(() => Array(width).fill('X'));
    gameState.wordLocations = {};
    
    const directions = [{x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: -1, y: -1}, {x: -1, y: 1}];

    for (const word of WORDS) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 200) {
            const startRow = Math.floor(Math.random() * height);
            const startCol = Math.floor(Math.random() * width);
            const direction = directions[Math.floor(Math.random() * directions.length)];
            
            if (canPlaceWord(word, startRow, startCol, direction, width, height)) {
                placeWord(word, startRow, startCol, direction);
                gameState.wordLocations[word] = { startRow, startCol, direction, word };
                placed = true;
            }
            attempts++;
        }
    }

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
        if (row < 0 || row >= height || col < 0 || col >= width) return false;
        const cell = gameState.puzzle[row][col];
        if (cell !== 'X' && cell !== word[i]) return false;
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
            
            btn.addEventListener('mousedown', (e) => handleStart(e, rowIndex, colIndex, 'mouse'));
            btn.addEventListener('mouseover', (e) => handleMove(e, rowIndex, colIndex, 'mouse'));
            btn.addEventListener('touchstart', (e) => handleStart(e, rowIndex, colIndex, 'touch'), {passive: false});
            btn.addEventListener('touchmove', (e) => handleMove(e, rowIndex, colIndex, 'touch'), {passive: false});
            
            puzzleEl.appendChild(btn);
        });
    });
    
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd, {passive: false});
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

function handleStart(e, rowIndex, colIndex, type) {
    if (!gameState.gameStarted) return;
    if (type === 'touch') e.preventDefault();
    
    gameState.isSelecting = true;
    gameState.selectedLetters = [];
    
    const key = `${rowIndex}-${colIndex}`;
    gameState.selectedLetters.push(key);
    document.getElementById(`cell-${rowIndex}-${colIndex}`).classList.add('selected');
}

function handleMove(e, rowIndex, colIndex, type) {
    if (!gameState.isSelecting) return;
    if (type === 'touch') e.preventDefault();
    
    const key = `${rowIndex}-${colIndex}`;
    if (gameState.selectedLetters.includes(key)) return;
    
    gameState.selectedLetters.push(key);
    document.getElementById(`cell-${rowIndex}-${colIndex}`).classList.add('selected');
    
    if (gameState.selectedLetters.length > 3) checkForWordRealTime();
}

function handleEnd(e) {
    if (e.type === 'touchend') e.preventDefault();
    gameState.isSelecting = false;
    
    if (gameState.selectedLetters.length >= 3) {
        checkForWord();
    } else if (gameState.selectedLetters.length > 0) {
        showError("¡Necesitas al menos 3 letras, guía!");
        clearSelection();
    }
}

function checkForWordRealTime() {
    const selectedText = gameState.selectedLetters.map(key => {
        const [row, col] = key.split('-');
        return gameState.puzzle[row][col];
    }).join('');
    const reverseText = selectedText.split('').reverse().join('');

    if (gameState.selectedLetters.length > 10) {
        showError("¡Demasiadas letras, pariente! Eso no es una palabra válida.");
        clearSelection();
        return;
    }

    for (const word of WORDS) {
        if (!gameState.foundWords.has(word) && (selectedText === word || reverseText === word)) {
            gameState.isSelecting = false;
            return;
        }
    }
}

function checkForWord() {
    if (gameState.selectedLetters.length < 3) {
        clearSelection();
        return;
    }

    const selectedText = gameState.selectedLetters.map(key => {
        const [row, col] = key.split('-');
        return gameState.puzzle[row][col];
    }).join('');
    const reverseText = selectedText.split('').reverse().join('');

    for (const word of WORDS) {
        if (!gameState.foundWords.has(word) && (selectedText === word || reverseText === word)) {
            markWordFound(word);
            return;
        }
    }

    showError("¡Eso no es una palabra válida, amigo!");
    clearSelection();
}

function clearSelection() {
    document.querySelectorAll('.letter-btn.selected').forEach(btn => btn.classList.remove('selected'));
    gameState.selectedLetters = [];
    gameState.isSelecting = false;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    /* CAMBIO: Se actualizó el fondo a Azul Oscuro (#003DA5) sólido en lugar del degradado rojo antiguo */
    errorDiv.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #003DA5; color: white; padding: 20px 40px; border-radius: 10px; font-weight: 600; font-size: 1rem; z-index: 999; box-shadow: 0 8px 20px rgba(0,0,0,0.15); animation: slideDown 0.4s ease; -webkit-user-select: none; user-select: none; border: 2px solid white;`;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 2000);
}

function markWordFound(word) {
    gameState.foundWords.add(word);
    gameState.selectedLetters = [];
    document.querySelectorAll('.letter-btn.selected').forEach(btn => btn.classList.remove('selected'));

    const wordLoc = gameState.wordLocations[word];
    if (wordLoc) {
        for (let i = 0; i < word.length; i++) {
            const row = wordLoc.startRow + (wordLoc.direction.y * i);
            const col = wordLoc.startCol + (wordLoc.direction.x * i);
            const cell = document.getElementById(`cell-${row}-${col}`);
            if (cell) cell.classList.add('found');
        }
    }

    const wordEl = document.getElementById(`word-${word}`);
    if (wordEl) wordEl.classList.add('found');

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

function resetGame() {
    gameState.foundWords.clear();
    gameState.selectedLetters = [];
    gameState.isSelecting = false;
    document.querySelectorAll('.letter-btn.selected, .letter-btn.found').forEach(btn => btn.classList.remove('selected', 'found'));
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

function showCompletionMessage() {
    document.getElementById('completionMessage').classList.add('active');
}

// Inicialización del juego al cargar el archivo
generatePuzzle();
renderPuzzle();
renderWordList();
updateProgress();
gameState.gameStarted = true;