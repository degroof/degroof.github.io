let clockRunning=false;
let currentGameNumber = getGameNumber();
let collapsed = false;

//start the onscreen clock
function startClock()
{
    setTimeout(updateClock,500);
    clockRunning=true;
}

//stop the onscreen clock
function stopClock()
{
    clockRunning=false;
}

//get whether the instructions are hidden
function getCollapsed()
{
    if(game.collapsed!=null && game.collapsed)
        return true;
    else
        return false;
}

//get the current game number based on the day
function getGameNumber()
{
    let url = new URL(window.location);
    let r = url.searchParams.get("random");
    let n = url.searchParams.get("number");
    let g = url.searchParams.get("game");
    const specificDate = new Date("2025-09-14 00:00").getTime();
    const now = new Date().getTime();
    const diffMs = now - specificDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if(g!=null&&!isNaN(g)&&parseInt(g)>=0&&parseInt(g)<=diffDays)
    {
        return Math.floor(parseInt(g));
    }
    else if(n!=null&&!isNaN(n)&&parseInt(n)>=0&&parseInt(n)<chainsInt.length)
    {
        return Math.floor(parseInt(n));
    }
    else if(r==1)
    {
        return Math.floor(Math.random()*chainsInt.length);
    }
    else
    {
        return diffDays;
    }
}

//get the elapsed time in hh:mm:ss format
function getElapsedTime()
{
    let st=(game.startTime)?game.startTime:new Date().getTime();
    let et=(game.endTime)?game.endTime:new Date().getTime();
    let elapsed= Math.floor((et-st)/1000);
    if(elapsed<0||elapsed>24*60*60) elapsed=0;
    let hr = Math.floor(elapsed/3600);
    if (hr < 10)
    {
        hr = "0" + hr;
    }
    let min = Math.floor((elapsed%3600)/60);
    if (min < 10)
    {
        min = "0" + min;
    }
    let sec = elapsed%60;
    if (sec < 10)
    {
        sec = "0" + sec;
    }
    return hr+":"+min+":"+sec;
}

//get the number of letters in the goal word
function getGoalCount()
{
    let gn=currentGameNumber;
    let chain=[];
    let chainInt=chainsInt[gn];
    for(let i=0;i<chainInt.length;i++)chain.push(words[chainInt[i]]);
    return chain[chain.length-1].length;
}

//get the word chain for this game
function getChain()
{
    let gn=currentGameNumber;
    let chain=[];
    let chainInt=chainsInt[gn];
    for(let i=0;i<chainInt.length;i++)chain.push(words[chainInt[i]]);
    return chain.toString().replaceAll(",","->");
}

//get the start word
function getWord()
{
    let gn=currentGameNumber;
    let chain=[];
    let chainInt=chainsInt[gn];
    return words[chainsInt[gn][0]];
}

//check if the word is in the dictionary
function isValidWord(word)
{
    return words.includes(word.toUpperCase());
}

const STORAGE_KEY = "ablatonyms_save";
//save the game info to local browser storage
function saveGame(state)
{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

//load the game info from local browser storage
function loadGame()
{
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    return null;
}

//UI items
const timer = document.getElementById("timer");
const titleRow = document.getElementById("title-row");
const instructions = document.getElementById("instructions");
const rowsContainer = document.getElementById("rows-container");
const actionButtons = document.getElementById("action-buttons");
const shareContainer = document.getElementById("share-container");
const modal = document.getElementById("modal");

let undoBtn;
let shareBtn;

//default game state
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
    undos:0,
    collapsed:false
};

const SUBTITLE_TEXT = `<h2>Game #${currentGameNumber}</h2>`;

//text at top of screen
const INSTRUCTIONS_TEXT = `<b>Instructions</b><span id="collapser" onclick="toggleCollapsed();">&#9650;</span>
<ul>
<li>Tap on one letter in the word, removing it to form a new word.</li>
<li>If the letter you tap on results in a valid word, the old word will turn green and you'll be presented with the new word.</li>
<li>Continue eliminating letters until you reach the goal of a one-letter word.</li>
<li>If the letter to choose doesn't result in a valid word, that letter will turn red and you'll need to pick a different one.</li>
<li>Even if you get a valid word, you might end up going down the wrong path, but you can always back up by tapping on UNDO.</li>
<li>For any given start word, there may be several right solutions... and quite a few wrong ones.</li>
</ul>
Get started by tapping on one of the letters below.`;

const INSTRUCTIONS_TEXT_C = `<b>Instructions</b><span id="collapser" onclick="toggleCollapsed();">&#9660;</span>`;

//put the title in fake buttons
function setupTitle()
{
    titleRow.innerHTML = "";
    "ABLATONYMS".split("").forEach(l =>
    {
        const btn = document.createElement("button");
        btn.textContent = l;
        btn.className = "game-title-btn";
        btn.classList.add("green")
        titleRow.appendChild(btn);
    });
}

//display the instructions
function setupInstructions()
{
    instructions.innerHTML = collapsed?INSTRUCTIONS_TEXT_C:INSTRUCTIONS_TEXT;
    let collapser = document.getElementById("collapser");
}

function toggleCollapsed()
{
    if(collapsed===undefined) collapsed=false;
    collapsed=!collapsed;
    game.collapsed=collapsed;
    saveGame(game);
    setupInstructions();
}

//display the game number
function setupSubtitle()
{
    subtitle.innerHTML = SUBTITLE_TEXT;
}

//start a new game
function startNewGame(word)
{
    game =
    {
        word:word,
        rows: [
        {
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
        gameNumber: currentGameNumber,
        wrongGuesses:0,
        moves:0,
        undos:0,
        collapsed: collapsed
    };
    saveGame(game);
    render();
}

//restore the game info from local storage
function restoreGame(state)
{
    game = state;
    if(!game.gameNumber || game.gameNumber!=currentGameNumber)
    {
        const word = getWord();
        startNewGame(word);
    }
    else
    {
        if(game.over)
            updateClock();
        else
            startClock();
    }
    render();
}

//fill the screen
function render()
{
    rowsContainer.innerHTML = "";
    //set up the letter rows
    game.rows.forEach((row, rowIdx) =>
    {
        const div = document.createElement("div");
        div.className = "button-row";
        row.letters.forEach((letter, colIdx) =>
        {
            const btn = document.createElement("button");
            btn.textContent = letter;
            btn.className = "letter-btn";
            if (row.status === "green") btn.classList.add("green");
            if (row.red && row.red.includes(colIdx)) btn.classList.add("red");
            if (row.status !== "active") btn.disabled = true;
            btn.onclick = () =>
            {
                if (row.status === "active" && !game.over)
                {
                    if(!game.startTime || game.startTime==0)
                    {
                        game.startTime=new Date().getTime();
                        startClock();
                    }
                    game.moves=game.moves+1;
                    checkWord(rowIdx, colIdx);
                    window.scrollTo(0, document.body.scrollHeight);
                }
            };
            div.appendChild(btn);
        });
        rowsContainer.appendChild(div);
    });

    //set up the action buttons
    actionButtons.innerHTML = "";
    if (!game.over && game.rows.length > 1 && game.rows[game.rows.length - 1].status === "active")
    {
        undoBtn = document.createElement("button");
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

    //set up share button
    shareContainer.innerHTML = "";
    if (game.over)
    {
        shareBtn = document.createElement("button");
        shareBtn.textContent = "SHARE";
        shareBtn.className = "share-btn";
        shareBtn.onclick = share;
        shareContainer.appendChild(shareBtn);
        window.scrollTo(0, document.body.scrollHeight);

    }
}

//check that the word is valid
function checkWord(rowIdx, colIdx)
{
    if (game.over) return;
    const row = game.rows[rowIdx];
    if (row.status !== "active") return;
    const newLetters = row.letters.slice();
    newLetters.splice(colIdx, 1);
    const newWord = newLetters.join("");
    const letterCount=newLetters.length;
    if (isValidWord(newWord)) //valid
    {
        row.status = "green";
        row.removed = colIdx;
        row.red = [];
        game.rows.push(
        {
            word: newWord,
            status: "active",
            removed: null,
            red: [],
            letters: newLetters
        });
        if (letterCount == getGoalCount())
        {
            game.rows[rowIdx+1].status = "green";
            endGame(true);
        }
    }
    else //invalid
    {
        game.wrongGuesses=game.wrongGuesses+1;
        if (!row.red) row.red = [];
        if (!row.red.includes(colIdx)) row.red.push(colIdx);
    }
    //end of game
    if (newLetters.length === 1 && isValidWord(newWord))
    {
        endGame(true);
    }
    saveGame(game);
    render();
}

//clear last word and move up to the last one
function undo()
{
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

//end game without finishing
function giveUp()
{
    endGame(false);
}

//show the elapsed time on the clock
function updateClock()
{
    timer.innerHTML=getElapsedTime();
    if(clockRunning)
    {
        setTimeout(updateClock,500);
    }
}

//end the game
function endGame(completed)
{
    game.over = true;
    game.completed = completed;
    game.endTime=new Date().getTime();
    stopClock();

    saveGame(game);
    render();

    //pop up a dialog with the results
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

//copy results to clipboard and pop up a confirmation dialog
function share()
{
    let result = "#Ablatonyms "+game.gameNumber+"\n";
    if(!game.completed) result+="Resigned\n";
    result += (game.moves?("Moves: "+game.moves+"\n"):"")+
                  (game.wrongGuesses?("Incorrect Moves: "+game.wrongGuesses+"\n"):"")+
                  (game.undos?("UNDOs: "+game.undos+"\n"):"")+
                  "Elapsed Time: "+getElapsedTime()+"\n";
    result += "https://degroof.github.io/ablatonyms.html"
    navigator.clipboard.writeText(result).then(() =>
    {
        showModal("Results copied to clipboard", ["OK"]);
    });
}

//pop up a dialog
function showModal(message, buttons)
{
    modal.innerHTML = "";
    modal.classList.remove("hidden");
    const content = document.createElement("div");
    content.className = "modal-content";
    const p = document.createElement("p");
    p.innerHTML = message;
    content.appendChild(p);
    buttons.forEach(btnLabel =>
    {
        const btn = document.createElement("button");
        btn.textContent = btnLabel;
        btn.className = "modal-btn";
        btn.onclick = () =>
        {
            modal.classList.add("hidden");
        };
        content.appendChild(btn);
    });
    modal.appendChild(content);
}

//initialize the app
window.onload = function ()
{
    setupTitle();
    setupInstructions();
    setupSubtitle();
    const saved = loadGame();
    collapsed=getCollapsed();
    if (saved && saved.word)
    {
        restoreGame(saved);
        updateClock();
    }
    else
    {
        const word = getWord();
        startNewGame(word);
    }
};

