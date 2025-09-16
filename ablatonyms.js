
function getGameNumber()
{
    const specificDate = new Date("2025-09-14 00:00").getTime();
    const now = new Date().getTime();
    const diffMs = now - specificDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getElapsedTime()
{
    let st=(game.startTime)?game.startTime:new Date().getTime();
    let et=(game.endTime)?game.endTime:new Date().getTime();
    let elapsed= Math.floor((et-st)/1000);
console.log(elapsed)
    if(elapsed<0||elapsed>24*60*60) elapsed=0;
    let hr = Math.floor(elapsed/3600);
    if (hr < 10) {
        hr = "0" + hr;
    }
    let min = Math.floor((elapsed%3600)/60);
    if (min < 10) {
        min = "0" + min;
    }
    let sec = elapsed%60;
    if (sec < 10) {
        sec = "0" + sec;
    }
    return hr+":"+min+":"+sec;
}


function getScore()
{
    let gn=getGameNumber();
    let chain=[];
    let chainInt=chainsInt[gn];
    for(let i=0;i<chainInt.length;i++)chain.push(words[chainInt[i]]);
    let total=chain.length-1;
    let guesses=game.rows.length-1;
    return guesses+"/"+total;
}

function getGoalCount()
{
    let gn=getGameNumber();
    let chain=[];
    let chainInt=chainsInt[gn];
    for(let i=0;i<chainInt.length;i++)chain.push(words[chainInt[i]]);
    return chain[chain.length-1].length;
}

function getGoal()
{
    return "a "+getGoalCount()+" letter word. Get started by tapping the letters below.";
}


function getChain()
{
    let gn=getGameNumber();
    let chain=[];
    let chainInt=chainsInt[gn];
    for(let i=0;i<chainInt.length;i++)chain.push(words[chainInt[i]]);
    return chain.toString().replaceAll(",","->");
}


function getWord()
{
    let gn=getGameNumber();
    let chain=[];
    let chainInt=chainsInt[gn];
    return words[chainsInt[gn][0]];
}

function isValidWord(word) {
    return words.includes(word.toUpperCase());
}

const STORAGE_KEY = "ablatonyms_save";
function saveGame(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    return null;
}

function clearGame() {
    localStorage.removeItem(STORAGE_KEY);
}

const timer = document.getElementById("timer");
const titleRow = document.getElementById("title-row");
const instructions = document.getElementById("instructions");
const rowsContainer = document.getElementById("rows-container");
const actionButtons = document.getElementById("action-buttons");
const shareContainer = document.getElementById("share-container");
const modal = document.getElementById("modal");

let game = {
    word:"",
    rows:[],
    over:false,
    completed: false,
    startTime: 0,
    endTime:0,
    goal:1,
    gameNumber:0,
    wrongGuesses:0,
    moves:0,
    undos:0
};


const INSTRUCTIONS_TEXT = `Tap letters, removing one at a time to form new words and reach the goal word length.
You can always back up by tapping UNDO. For any given start word, there may be several right solutions — and
 a lot more wrong ones. Today's goal is `;

function setupTitle() {
    titleRow.innerHTML = "";
    "ABLATONYMS".split("").forEach(l => {
        const btn = document.createElement("button");
        btn.textContent = l;
        btn.className = "game-title-btn";
        btn.classList.add("green")
        titleRow.appendChild(btn);
    });
}

function setupInstructions() {
    instructions.innerHTML = INSTRUCTIONS_TEXT+getGoal();
}

function startNewGame(word) {
    game = {
        word,
        rows: [{
            word,
            status: "active",
            removed: null,
            red: [],
            letters: word.split("")
        }],
        over: false,
        completed: false,
        startTime: 0,
        endTime: 0,
        gameNumber: getGameNumber(),
        wrongGuesses:0,
        moves:0,
        undos:0
    };

    saveGame(game);
    render();
}

function restoreGame(state) {
    game = state;
    if(!game.gameNumber || game.gameNumber!=getGameNumber())
    {
        const word = getWord();
        startNewGame(word);
    }
    else
    {
        if(game.over)
            updateClock();
        else
            clockInterval=setInterval(updateClock, 200);
    }
    render();
}

function render() {
    rowsContainer.innerHTML = "";
    game.rows.forEach((row, rowIdx) => {
        const div = document.createElement("div");
        div.className = "button-row";
        row.letters.forEach((letter, colIdx) => {
            const btn = document.createElement("button");
            btn.textContent = letter;
            btn.className = "letter-btn";
            if (row.status === "green") btn.classList.add("green");
            if (row.red && row.red.includes(colIdx)) btn.classList.add("red");
            if (row.status !== "active") btn.disabled = true;
            btn.onclick = () => {
                if (row.status === "active" && !game.over)
                {
                    if(!game.startTime || game.startTime==0)
                    {
                        game.startTime=new Date().getTime();
                        clockInterval=setInterval(updateClock, 200);
                    }
                    game.moves=game.moves+1;
                    checkWord(rowIdx, colIdx);
                }
            };
            div.appendChild(btn);
        });
        rowsContainer.appendChild(div);
    });

    actionButtons.innerHTML = "";
    if (!game.over && game.rows.length > 1 && game.rows[game.rows.length - 1].status === "active") {
        const undoBtn = document.createElement("button");
        undoBtn.textContent = "UNDO";
        undoBtn.className = "action-btn";
        undoBtn.onclick = undo;
        actionButtons.appendChild(undoBtn);

        const giveUpBtn = document.createElement("button");
        giveUpBtn.textContent = "GIVE UP";
        giveUpBtn.className = "action-btn";
        giveUpBtn.onclick = giveUp;
        actionButtons.appendChild(giveUpBtn);
    }

    shareContainer.innerHTML = "";
    if (game.over) {
        const shareBtn = document.createElement("button");
        shareBtn.textContent = "SHARE";
        shareBtn.className = "share-btn";
        shareBtn.onclick = share;
        shareContainer.appendChild(shareBtn);
    }
}

function checkWord(rowIdx, colIdx) {
    if (game.over) return;
    const row = game.rows[rowIdx];
    if (row.status !== "active") return;
    const newLetters = row.letters.slice();
    newLetters.splice(colIdx, 1);
    const newWord = newLetters.join("");
    const letterCount=newLetters.length;
    if (isValidWord(newWord))
    {
        row.status = "green";
        row.removed = colIdx;
        row.red = [];
        game.rows.push({
            word: newWord,
            status: "active",
            removed: null,
            red: [],
            letters: newLetters
        });
        if (letterCount == getGoalCount()) {
            endGame(true);
        }
    } else {
        game.wrongGuesses=game.wrongGuesses+1;
        if (!row.red) row.red = [];
        if (!row.red.includes(colIdx)) row.red.push(colIdx);
    }

    if (newLetters.length === 1 && isValidWord(newWord)) {
        endGame(true);
    }
    saveGame(game);
    render();
}

function undo() {
    if (game.rows.length <= 1 || game.over) return;
    game.rows.pop();
    const prevRow = game.rows[game.rows.length - 1];
    prevRow.status = "active";
    prevRow.red = [];
    prevRow.removed = null;
    game.undos=game.undos+1;
    saveGame(game);
    render();
}

function giveUp() {
    endGame(false);
}


function updateClock()
{
    timer.innerHTML=getElapsedTime();
}

function endGame(completed) {
    game.over = true;
    game.completed = completed;
    game.endTime=new Date().getTime();
    clearInterval(clockInterval);

    saveGame(game);
    render();
    let results = (game.moves?("Moves: "+game.moves+"<br>"):"")+
                  (game.wrongGuesses?("Incorrect Moves: "+game.wrongGuesses+"<br>"):"")+
                  (game.undos?("UNDOs: "+game.undos+"<br>"):"")+
                  "Elapsed Time: "+getElapsedTime();

    showModal(completed
        ? "Game completed.<br>"+results
        : "We were looking for "+getChain()+".<br>"+results,
        ["OK"]
    );
}

function share() {
    let result = "#Ablatonyms "+game.gameNumber+"\n";
    if(!game.completed) result+="Resigned\n";
    result += (game.moves?("Moves: "+game.moves+"\n"):"")+
                  (game.wrongGuesses?("Incorrect Moves: "+game.wrongGuesses+"\n"):"")+
                  (game.undos?("UNDOs: "+game.undos+"\n"):"")+
                  "Elapsed Time: "+getElapsedTime()+"\n";
    result += "https://degroof.github.io/ablatonyms.html"
    navigator.clipboard.writeText(result).then(() => {
        showModal("Results copied to clipboard", ["OK"]);
    });
}

function showModal(message, buttons) {
    modal.innerHTML = "";
    modal.classList.remove("hidden");
    const content = document.createElement("div");
    content.className = "modal-content";
    const p = document.createElement("p");
    p.innerHTML = message;
    content.appendChild(p);
    buttons.forEach(btnLabel => {
        const btn = document.createElement("button");
        btn.textContent = btnLabel;
        btn.className = "modal-btn";
        btn.onclick = () => {
            modal.classList.add("hidden");
        };
        content.appendChild(btn);
    });
    modal.appendChild(content);
}

let clockInterval;

window.onload = function () {
    setupTitle();
    setupInstructions();
    const saved = loadGame();
    if (saved && saved.word) {
        restoreGame(saved);
        updateClock();
    } else {
        const word = getWord();
        startNewGame(word);
    }
};

