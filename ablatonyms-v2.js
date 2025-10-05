let clockRunning=false;
let currentGameNumber = getGameNumber();
let collapsed = false;
let nodes = [];

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

//get the game score
function getScore()
{
    let wordsCompleted=game.rows.length-1;
    let characters=getWord().length;
    let errors=game.wrongGuesses;
    let undos=game.undos;
    let score=100*wordsCompleted/(characters-1+errors+undos);
    let st=(game.startTime)?game.startTime:new Date().getTime();
    let et=(game.endTime)?game.endTime:new Date().getTime();
    let elapsed= Math.floor((et-st)/1000);
    if(elapsed<0||elapsed>24*60*60) elapsed=0;
    if(elapsed<2*(characters-1)&&score==100) score+=10;
    return Math.round(score);
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
let treeBtn;

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
    collapsed:false,
    progress: ""
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
        collapsed: collapsed,
        progress: ""
    };
    saveGame(game);
    render();
}

//restore the game info from local storage
function restoreGame(state)
{
    game = state;
    collapsed = game.collapsed;
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
        treeBtn = document.createElement("button");
        treeBtn.textContent = "VIEW TREE";
        treeBtn.className = "share-btn";
        treeBtn.onclick = tree;
        shareContainer.appendChild(treeBtn);
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
        game.progress=game.progress+"✅";
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
        game.progress=game.progress+"❌";
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
    game.progress=game.progress+"↩️";
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
    let score=getScore();
    //pop up a dialog with the results
    let results = (game.moves?("Moves: "+game.moves+"<br>"):"")+
                  (game.wrongGuesses?("Incorrect Moves: "+game.wrongGuesses+"<br>"):"")+
                  (game.undos?("UNDOs: "+game.undos+"<br>"):"")+
                  "Elapsed Time: "+getElapsedTime()+"<br>"+
                  (score==110?("Time Bonus: +10<br>"):"")+
                  "Score: "+getScore();

    showModal(completed
        ? "Game completed.<br>"+results
        : "We were looking for "+getChain()+".<br>"+results,
        ["OK"]
    );
}

//copy results to clipboard and pop up a confirmation dialog
function share()
{
    let symbol="   ";
    let score=getScore();
    let result = "#Ablatonyms "+game.gameNumber+"\n";
    if(!game.completed)
    {
        result+="Resigned\n";
        symbol="  🤷";
    }
    else
    {
        if(score==110)
        {
            symbol="  🎉";
        }
        else if(score==100)
        {
            symbol="  💯";
        }
        else
        {
            symbol="  🙂";
        }
    }
    result+=game.progress+symbol+"\n";
    result += (game.moves?("Moves: "+game.moves+"\n"):"")+
                  (game.wrongGuesses?("Incorrect Moves: "+game.wrongGuesses+"\n"):"")+
                  (game.undos?("UNDOs: "+game.undos+"\n"):"")+
                  "Elapsed Time: "+getElapsedTime()+"\n"+
                  (score==110?("Time Bonus: +10\n"):"")+
                  "Score: "+getScore()+"\n";
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

function tree()
{
    showTree(getWord());
}

function showTree(word)
{
    nodes=[];
    const game = document.getElementById("game-container");
    const tree = document.getElementById("treeContainer");
    game.style.display="none";
    tree.style.display="block";
    tree.scrollLeft=(2000-tree.clientWidth)/2;
    drawTree(word);
}

function hideTree(word)
{
    const game = document.getElementById("game-container");
    const tree = document.getElementById("treeContainer");
    game.style.display="block";
    tree.style.display="none";
}

function drawTree(word)
{
    const xSpacing=130;
    const ySpacing=100;
    //make top node
    let level = 0;
    makeNode(word.toUpperCase(),null,level);
    let remainingWords = [word.toUpperCase()];
    let wordLength = word.length;
    //loop through levels, generating child words
    while(remainingWords.length>0 && wordLength>0)
    {
        level++;
        wordLength--;
        let r=[];
        for(let i=0;i<remainingWords.length;i++)
        {
            let p=remainingWords[i];
            for(let j=0;j<p.length;j++)
            {
                let c=p.slice(0, j) + p.slice(j+1);
                if(words.includes(c))
                {
                    makeNode(c,p,level);
                    r.push(c);
                }
            }
        }
        remainingWords=r;
    }
    //mark all dead ends
    //nodes.forEach(n => n.green=(n.children.length>0||n.word.length==1));
    for(let level=word.length-2;level>0;level--)
    {
        let ns=nodes.filter(n => n.level==level);
        for(let i=0;i<ns.length;i++)
        {
            let gc=nodes.filter(n => (ns[i].children.includes(n.word)&&n.green));
            ns[i].green=gc.length>0;
        }
    }
    //loop through levels, setting x and y
    for(let level=0;level<word.length;level++)
    {
        let ns=nodes.filter(n => n.level==level);
        for(let i=0;i<ns.length;i++)
        {
            ns[i].y=level*ySpacing+100;
            ns[i].x=(2000/2)+i*xSpacing-(ns.length-1)/2*xSpacing;
        }
    }
    console.log(nodes);
    //draw nodes
    const treeWordsDiv = document.getElementById("treeWords");
    treeWordsDiv.innerHTML = "";
    nodes.forEach(node => {
        let el = document.createElement("div");
        el.className = node.green?"word-node-green":"word-node-red";
        el.textContent = node.word;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
        el.setAttribute("data-id", node.id);
        treeWordsDiv.appendChild(el);
        let w=el.getBoundingClientRect().width;
        let h=el.getBoundingClientRect().height;
        el.style.left = `${node.x-w/2}px`;
        el.style.top = `${node.y-h/2}px`;
    });
    //draw lines
    const svg = document.getElementById("treeLines");
    svg.innerHTML = "";
    svg.setAttribute("width", "1000");
    svg.setAttribute("height", "2000");
    nodes.forEach(node =>
    {
        node.parents.forEach(parent =>
        {
            let toNode = nodes.filter(parentNode => parentNode.word===parent)[0];
            let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", node.x );
            line.setAttribute("y1", node.y);
            line.setAttribute("x2", toNode.x);
            line.setAttribute("y2", toNode.y);
            line.setAttribute("stroke", "#000000");
            line.setAttribute("stroke-width", "2");
            svg.appendChild(line);
        });
    });


}

function makeNode(word,parent,level)
{
    let parentNodes = [];
    let node = {word: word, parents: [], children: [], level: level, green: true, x:0, y:0};
    if(parent!=null)
    {
        //add word to parent's child list
        let parentNode = nodes.filter(p => p.word === parent)[0];
        if(!parentNode.children.includes(word))
        {
            parentNode.children.push(word);
        }
        //use existing node if found
        let existingNodes = nodes.filter(e => e.word === word);
        if(existingNodes.length!=0)
        {
            node = existingNodes[0];
        }
        else
        {
            nodes.push(node);
        }
        //add all possible parents
        node.parents=[];
        parentNodes = nodes.filter(p => p.children.includes(word));
        parentNodes.forEach(p => node.parents.push(p.word));
    }
    else
    {
        nodes.push(node);
    }
}


//initialize the app
window.onload = function ()
{
    setupTitle();
    setupSubtitle();
    const saved = loadGame();
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
    collapsed=getCollapsed();
    setupInstructions();
    let url = new URL(window.location);
    let c = url.searchParams.get("check");
    if(c!=null) showTree(c);
};

