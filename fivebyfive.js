// Game state
let gameData = [];
let gameNumber = 0;
let gameStatus = 'new'; // 'new', 'in progress', 'win', 'resign'
let boardState = {}; // Maps grid square number to tile letter
let startTime = null;
let timerInterval = null;
let draggedTile = null;
let hints = 0;
let moves = 0;
let wordsFound = 0;
let elapsed = 0;
let checkActive = false;
let checkBackupState = {};
let tilePositions = {};
let squareColors = [];

// Black squares on the grid (those that cannot have tiles)
const BLACK_SQUARES = [6, 8, 16, 18];

// Valid target rows and columns
const VALID_ROWS = [0, 2, 4];
const VALID_COLS = [0, 2, 4];

// Row configurations (which squares make up each row)
const ROWS = {
    0: [0, 1, 2, 3, 4],
    2: [10, 11, 12, 13, 14],
    4: [20, 21, 22, 23, 24]
};

// Column configurations (which squares make up each column)
const COLS = {
    0: [0, 5, 10, 15, 20],
    2: [2, 7, 12, 17, 22],
    4: [4, 9, 14, 19, 24]
};



// Expected letter indices
const EXPECTED = [
    [0,0],[0,1],[0,2],[0,3],[0,4],
    [3,1],[-1,-1],[4,1],[-1,-1],[5,1],
    [1,0],[1,1],[1,2],[1,3],[1,4],
    [3,3],[-1,-1],[4,3],[-1,-1],[5,3],
    [2,0],[2,1],[2,2],[2,3],[2,4]
];


const WORD_SQUARES = [
    [0,1,2,3,4],
    [10,11,12,13,14],
    [20,21,22,23,24],
    [0,5,10,15,20],
    [2,7,12,17,22],
    [4,9,14,19,24]
    ];

// DOM Elements
const gameGrid = document.getElementById('gameGrid');
const tileRack = document.getElementById('tileRack');
const gameNumberEl = document.getElementById('gameNumber');
const giveUpBtn = document.getElementById('giveUpBtn');
const hintBtn = document.getElementById('hintBtn');
const checkBtn = document.getElementById('checkBtn');
const shareBtn = document.getElementById('shareBtn');
const instructionsToggle = document.getElementById('instructionsToggle');
const instructionsContent = document.getElementById('instructionsContent');

// Initialize game on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});

// Add drag event listeners to game-board-container
const gameBoardContainer = document.querySelector('.game-board-container');

gameBoardContainer.addEventListener('dragover', handleDragOver);
gameBoardContainer.addEventListener('drop', handleDropOnContainer);
gameBoardContainer.addEventListener('dragleave', handleDragLeave);

/**
 * Calculate game number based on days since start
 */
function calculateGameNumber() {
    const baseDate = new Date('2026-05-18 00:00:00').getTime();
    const today = new Date().getTime();
    const daysDiff = Math.floor((today - baseDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, daysDiff);
}

/**
 * Initialize the game
 */
function initializeGame() {
    gameNumber = calculateGameNumber();
    
    // Try to load saved game state
    const savedState = loadGameState();
    
    if (savedState && savedState.gameNumber === gameNumber) {
        // Restore saved game
        gameStatus = savedState.gameStatus;
        boardState = savedState.boardState;
        startTime = savedState.startTime;
        gameData = grids[gameNumber - 1] || grids[0];
        hints = savedState.hints;
        moves = savedState.moves;
        wordsFound = savedState.wordsFound;
        elapsed = savedState.elapsed;
    } else {
        // New game
        gameStatus = 'new';
        boardState = {};
        startTime = null;
        gameData = grids[gameNumber - 1] || grids[0];
        hints = 0;
        moves = 0;
        wordsFound = 0;
        elapsed = 0;
    }
    
    gameNumberEl.textContent = `Game #${gameNumber}`;
    
    // Render UI
    renderGrid();
    renderTileRack();
    updateButtonVisibility();
    
    // If saved game, restore board state
    if (savedState && savedState.gameNumber === gameNumber) {
        restoreBoardState();
        checkBoard();
    }
}

/**
 * Render the 5x5 grid
 */
function renderGrid() {
    gameGrid.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
        const square = document.createElement('div');
        square.className = 'grid-square';
        square.id = `square-${i}`;
        
        if (BLACK_SQUARES.includes(i)) {
            square.classList.add('black');
        } else {
            square.classList.add('white');
            //square.draggable = true;
            square.addEventListener('dragover', handleDragOver);
            square.addEventListener('drop', handleDrop);
            square.addEventListener('dragleave', handleDragLeave);
        }
        
        gameGrid.appendChild(square);
    }
}

/**
 * Render the tile rack below the grid
 */
function renderTileRack() {
    tileRack.innerHTML = '';
    const tileLetters = gameData[6];
    
    // Create 4 rows of 5 tiles + 1 centered tile
    for (let i = 0; i < 21; i++) {
        const slot = document.createElement('div');
        slot.className = 'tile-rack-slot';
        slot.id = `rack-slot-${i}`;
        
        // Add centered class to the 21st tile
       /* if (i === 20) {
            slot.classList.add('centered');
        }*/
        
        tileRack.appendChild(slot);
        
        const tile = document.createElement('div');
        tile.className = 'tile black-on-white';
        tile.textContent = tileLetters[i];
        tile.id = `tile-${i}`;
        tile.draggable = true;
        tile.dataset.tileIndex = i;
        tile.addEventListener('dragstart', handleDragStart);
        tile.addEventListener('dragend', handleDragEnd);
        
        slot.appendChild(tile);
        tilePositions[i] = slot;
    }
}

/**
 * Get current row word
 */
function getRowWord(rowNumber) {
    if (![0, 2, 4].includes(rowNumber)) {
        return '';
    }
    
    const squares = ROWS[rowNumber];
    let word = '';
    
    for (let square of squares) {
        if (!boardState[square]) {
            return ''; // Not all squares populated
        }
        word += boardState[square];
    }
    
    return word;
}

/**
 * Get current column word
 */
function getColWord(colNumber) {
    if (![0, 2, 4].includes(colNumber)) {
        return '';
    }
    
    const squares = COLS[colNumber];
    let word = '';
    
    for (let square of squares) {
        if (!boardState[square]) {
            return ''; // Not all squares populated
        }
        word += boardState[square];
    }
    
    return word;
}

/**
 * Set tile color on a grid square
 */
function setTileColor(squareNumber, color) {
    const square = document.getElementById(`square-${squareNumber}`);
    if (!square) return;
    
    const tile = square.querySelector('.tile');
    if (!tile) return;
    
    // Remove all color classes
    tile.classList.remove('black-on-white', 'white-on-red', 'white-on-green');
    
    // Add appropriate class
    if (color === 'white') {
        tile.classList.add('black-on-white');
    } else if (color === 'red') {
        tile.classList.add('white-on-red');
    } else if (color === 'green') {
        tile.classList.add('white-on-green');
    }
}

function getTileColor(squareNumber)
{
    const square = document.getElementById(`square-${squareNumber}`);
    if (!square) return '';

    const tile = square.querySelector('.tile');
    if (!tile) return '';

    if(tile.classList.contains('black-on-white')) return 'white';
    if(tile.classList.contains('white-on-red')) return 'red';
    if(tile.classList.contains('white-on-green')) return 'green';

}

/**
 * Call checkBoard() - validates current board state
 */
function checkBoard() {
    // Save game state
    saveGameState();
    let letters = gameData[6];
    let good=[];
    let bad=[];
    for(let wordInd of WORD_SQUARES)
    {
        let word="";
        for(let i=0;i<5;i++)
        {
            word+=letters[boardState[wordInd[i]]];
            setTileColor(wordInd[i],"white");
        }
        if(word.length==5)
        {
            if(WORDS.includes(word))
            {
                good.push(wordInd);
            }
            else
            {
                bad.push(wordInd);
            }
        }
    }
    wordsFound=0;
    for(let badInd of bad)
    {
        for(let i=0;i<5;i++)
        {
            setTileColor(badInd[i],"red");
        }
    }
    for(let goodInd of good)
    {
        wordsFound++;
        for(let i=0;i<5;i++)
        {
            setTileColor(goodInd[i],"green");
        }
    }
    if(wordsFound==6) win();
    saveGameState();
    // Update button visibility
    updateButtonVisibility();
}

/**
 * Win the game
 */
function win() {
    gameStatus = 'win';
    
    for (let squareNumber = 0; squareNumber < 25; squareNumber++) {
        if (boardState[squareNumber]) {
            setTileColor(squareNumber, 'green');
        }
    }

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    saveGameState();
    updateButtonVisibility();
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
    // Only allow dragging if game status is 'new' or 'in progress'
    if (!['new', 'in progress'].includes(gameStatus)) {
        e.preventDefault();
        return;
    }
    
    // Start timer if not already started
    if (gameStatus === 'new') {
        gameStatus = 'in progress';
        startTimer();
        updateButtonVisibility();
    }
    
    draggedTile = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    
    // Visual feedback
    e.target.style.opacity = '0.5';
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
    if (draggedTile) {
        draggedTile.style.opacity = '1';
    }
    draggedTile = null;
}

/**
 * Handle drag over
 */

function handleDragOver(e) {
    if (!draggedTile) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Check if target is a grid square or the container
    if (e.target.classList.contains('grid-square')) {
        const squareNum = parseInt(e.target.id.split('-')[1]);
        if (!BLACK_SQUARES.includes(squareNum)) {
            e.target.classList.add('drag-over');
        }
    } else if (e.target.closest('.game-board-container')) {
        // Highlight container area
        e.target.classList.add('drag-over');
    }
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

/**
 * Handle drop
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.classList.remove('drag-over');
    
    if (!draggedTile) return;
    
    // Only allow dropping if game is 'new' or 'in progress'
    if (!['new', 'in progress'].includes(gameStatus)) {
        return;
    }
    
    const squareNumber = parseInt(e.target.id.split('-')[1]);

    //can't drop on a tile
    if(e.target.id.split('-')[0]==="tile") return;

    // Check if it's a valid drop target
    if (BLACK_SQUARES.includes(squareNumber)) {
        // Black square - return to original location
        returnTileToRack(draggedTile);
        checkBoard();
        return;
    }
    
    // Valid drop - place tile on grid
    const tileIndex = parseInt(draggedTile.dataset.tileIndex);
    const letter = gameData[6][tileIndex];

    // Remove from previous location in boardState
    for (let sq in boardState) {
        const tile = document.getElementById(`square-${sq}`).querySelector(`#tile-${tileIndex}`);
        if (tile) {
            delete boardState[sq];
        }
    }

    // Add to new location
    boardState[squareNumber] = tileIndex;

    // Move tile to grid square
    e.target.appendChild(draggedTile);
    draggedTile.style.position = 'absolute';
    draggedTile.style.top = '4';
    draggedTile.style.left = '4';
    moves++;
    checkBoard();
}

/**
 * Handle drop on game-board-container (outside grid)
 */
function handleDropOnContainer(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');

    if (!draggedTile) return;

    // If dropped outside the grid, return to rack
    returnTileToRack(draggedTile);
    checkBoard();
}


/**
 * Return tile to original rack position
 */
function returnTileToRack(tile) {
    const tileIndex = parseInt(tile.dataset.tileIndex);
    const rackSlot = tilePositions[tileIndex];
    
    if (rackSlot) {
        // Remove from grid board state
        for (let square in boardState) {
            const squareEl = document.getElementById(`square-${square}`);
            if (squareEl && squareEl.querySelector(`#tile-${tileIndex}`)) {
                delete boardState[square];
                break;
            }
        }
        
        // Reset tile colors
        tile.classList.remove('white-on-red', 'white-on-green');
        tile.classList.add('black-on-white');
        
        // Move back to rack
        rackSlot.appendChild(tile);
        tile.style.position = 'relative';
    }
}

/**
 * Restore board state from saved state
 */
function restoreBoardState() {
    for (let squareNumber in boardState) {
        const tileIndex = boardState[squareNumber];
        const square = document.getElementById(`square-${squareNumber}`);
        if (square) {
            if (tileIndex !== -1) {
                const tile = document.getElementById(`tile-${tileIndex}`);
                if (tile) {
                    square.appendChild(tile);
                    tile.style.position = 'absolute';
                    tile.style.top = '4';
                    tile.style.left = '4';
                }
            }
        }
    }
}

/**
 * Start the timer
 */
function startTimer() {
    startTime = Date.now();
    
    timerInterval = setInterval(() => {
        elapsed = Math.floor((Date.now() - startTime) / 1000);
    }, 1000);
}

/**
 * Save game state to local storage
 */
function saveGameState() {
    const state = {
        gameNumber: gameNumber,
        gameStatus: gameStatus,
        boardState: boardState,
        startTime: startTime,
        hints: hints,
        moves: moves,
        wordsFound: wordsFound,
        elapsed: elapsed
    };
    
    localStorage.setItem('5x5_gameState', JSON.stringify(state));
}

/**
 * Load game state from local storage
 */
function loadGameState() {
    const saved = localStorage.getItem('5x5_gameState');
    return saved ? JSON.parse(saved) : null;
}

/**
 * Update button visibility based on game status
 */
function updateButtonVisibility() {
    giveUpBtn.style.display = gameStatus === 'in progress' ? 'block' : 'none';
    hintBtn.style.display = ['new', 'in progress'].includes(gameStatus) && (hints < 3) ? 'block' : 'none';
    checkBtn.style.display = ['win', 'resign'].includes(gameStatus) ? 'block' : 'none';
    shareBtn.style.display = ['win', 'resign'].includes(gameStatus) ? 'block' : 'none';
}

/**
 * Clear board
 */
function clearBoard()
{
    // Clear board
    boardState = {};
    for (let i = 0; i < 25; i++) {
        const square = document.getElementById(`square-${i}`);
        if (square) {
            const tile = square.querySelector('.tile');
            if (tile) {
                const tileIndex = parseInt(tile.dataset.tileIndex);
                const slot = tilePositions[tileIndex];
                if (slot) {
                    slot.appendChild(tile);
                    tile.style.position = 'relative';
                }
            }
        }
    }
}


/**
 * Handle CHECK button - show solution temporarily
 */
function handleCheckMouseDown() {
    if (!['win', 'resign'].includes(gameStatus)) return;
    
    checkActive = true;
    squareColors = [];
    for(let i=0;i<25;i++)
    {
        squareColors.push(getTileColor(i));
        setTileColor(i,'white');
    }

    
    // Backup current board state
    checkBackupState = JSON.parse(JSON.stringify(boardState));
    
    clearBoard();
    // Place the solution
    placeWords(true);
}

/**
 * Handle CHECK button release - restore previous state
 */
function handleCheckMouseUp() {
    if (!checkActive) return;
    
    checkActive = false;
    
    clearBoard();
    
    // Restore backed up state
    boardState = checkBackupState;
    restoreBoardState();

    for(let i=0;i<25;i++)
    {
        if(squareColors[i]!='') setTileColor(i,squareColors[i]);
    }
}

/**
 * Place words on the board (for CHECK function)
 */
function placeWords(isCheck) {
    const words = gameData.slice(0, 6); // First 6 entries are the words
    
    // Place row words
    const rowWords = {
        0: words[0],
        2: words[1],
        4: words[2]
    };
    
    // Place column words
    const colWords = {
        0: words[3],
        2: words[4],
        4: words[5]
    };

    let letters = gameData[6];
    let usedTiles=[];
    // Place row words
    for (let i=0;i<25;i++) {
        let index=EXPECTED[i];
        let wordInd=index[0];
        let letterInd=index[1];
        if(wordInd>=0)
        {
            let word=gameData[wordInd];
            let letter=word[letterInd];
            let tileIndex = letters.split('').findIndex((char, i) => char === letter && !usedTiles.includes(i));
            usedTiles.push(tileIndex)
            const tile = document.getElementById(`tile-${tileIndex}`);
            if (tile) {
                const square = document.getElementById(`square-${i}`);
                if (square) {
                    square.appendChild(tile);
                    tile.style.position = 'absolute';
                    tile.style.top = '4';
                    tile.style.left = '4';
                    boardState[i] = letter;
                }
            }
        }
        
    }
}

/**
 * Handle GIVE UP button
 */
function handleGiveUp() {
    gameStatus = 'resign';
    saveGameState();
    updateButtonVisibility();
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
}

/**
 * Handle HINT button
 */
function handleHint() {

    if(gameStatus=='new')
     {
        gameStatus='in progress';
        startTimer();
     }

    for(let i=0;i<25;i++)
    {
        squareColors.push(getTileColor(i));
        setTileColor(i,'white');
    }

    hints++;
    let usedTiles=[];
    let revealedSquares=[];
    boardState = {};



    clearBoard();


    if(hints>=1) revealedSquares.push(12);
    if(hints>=2)
    {
        revealedSquares.push(2);
        revealedSquares.push(10);
        revealedSquares.push(14);
        revealedSquares.push(22);
    }
    if(hints>=3)
    {
        revealedSquares.push(0);
        revealedSquares.push(4);
        revealedSquares.push(20);
        revealedSquares.push(24);
    }
    let letters = gameData[6];
    let rowText = gameData[0]+"     "+gameData[1]+"     "+gameData[2];

    for(const square of revealedSquares)
    {
        let targetLetter = rowText[square];


        let index = letters.split('').findIndex((char, i) => char === targetLetter && !usedTiles.includes(i));
        usedTiles.push(index)
        boardState[square]=index;
    }

    restoreBoardState();
    checkBoard();
    saveGameState();
    updateButtonVisibility();
}

/**
 * Handle SHARE button
 */
function handleShare() {

    let emojis = "";
    for (i=0;i<25;i++)
    {
        let emoji="⬜";
        if(i==6||i==8||i==16||i==18) emoji = "⬛";
        let color=getTileColor(i);
        if(color=="green") emoji="🟩";
        if(color=="red") emoji="🟥";
        emojis+=emoji;
        if(i%5==4) emojis+="\n";
    }


    const shareText = `#FiveByFive - Game #${gameNumber}\n${emojis}Words Found: ${wordsFound}\nMoves: ${moves}\nHints: ${hints}\nTime: ${formatSeconds(elapsed)}\nhttps://degroof.github.io/fivebyfive.html`;
    
    navigator.clipboard.writeText(shareText).then(() => {
		showToast("Results copied to clipboard.");
   });
}

function showToast() {
  const toast = document.getElementById("toast");
  toast.className = "show";
  setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Use padStart to ensure two digits for minutes and seconds
  const hDisplay = String(hours).padStart(2, '0');
  const mDisplay = String(minutes).padStart(2, '0');
  const sDisplay = String(seconds).padStart(2, '0');

  return `${hDisplay}:${mDisplay}:${sDisplay}`;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    instructionsToggle.addEventListener('click', () => {
        if (instructionsContent.style.display === 'none') {
            instructionsContent.style.display = 'block';
        } else {
            instructionsContent.style.display = 'none';
        }
    });
    
    giveUpBtn.addEventListener('click', handleGiveUp);
    hintBtn.addEventListener('click', handleHint);

    checkBtn.addEventListener('mousedown', handleCheckMouseDown);
    checkBtn.addEventListener('mouseup', handleCheckMouseUp);
    checkBtn.addEventListener('touchstart', handleCheckMouseDown);
    checkBtn.addEventListener('touchend', handleCheckMouseUp);
    
    shareBtn.addEventListener('click', handleShare);
}
