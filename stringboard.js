let pan = { x: -5000, y: -5000 };
let zoom = 1;
let isPanning = false;
let activeNote = null;
let filename = "stringboard-untitled.json";

let startMouse = { x: 0, y: 0 };
let startPan = { x: 0, y: 0 };
let startNotePos = { x: 0, y: 0 };

const svgLayer = document.getElementById('svg-layer');
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const nodesLayer = document.getElementById('nodes-layer');
const addBtn = document.getElementById('add-note-btn');

const STORAGE_KEY = 'stringboard_state_v1';

let connections = [];       // { id, fromId, toId }
let selectedPinNote = null; 

let noteIdCounter = 0;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);


function updateWorldTransform() {
  world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
}


function screenToWorld(clientX, clientY) {
  return {
    x: (clientX - pan.x) / zoom,
    y: (clientY - pan.y) / zoom
  };
}

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * zoom + pan.x,
    y: worldY * zoom + pan.y
  };
}

function noteInner(hexColor,noteId,title)
{ 
console.log(hexColor);
console.log(noteId);
console.log(title);
return  `
    <div class="note-actions">
      <input type="color" class="color-picker" value="${hexColor}" title="Change Note Color" />
      <button class="delete-btn" title="Delete Note">&times;</button>
      <button class="duplicate-btn" title="Duplicate Note">+</button>
    </div>

    <div class="pin" data-note-id="${noteId}" title="Click to connect string"></div>

    <div class="note-text" title="Double-click to edit">${title}</div>
  `; 
}




function createNote({ title = "Placeholder text", color = "#FFFF80", worldX = 200, worldY = 200 }) {
  const noteId = `note_${++noteIdCounter}`;
  const note = document.createElement('div');
  note.className = 'note';
  note.id = noteId;
  note.style.left = `${worldX}px`;
  note.style.top = `${worldY}px`;
  note.style.backgroundColor = color;
  const hexColor=color.trim().startsWith("rgb")?rgbToHex(color):color;

  note.innerHTML = noteInner(hexColor,noteId,title);

  nodesLayer.appendChild(note);

  makeNoteDraggable(note);
  attachNoteEditListeners(note);
}

function attachNoteEditListeners(note) {
  const pin = note.querySelector('.pin');
  const titleEl = note.querySelector('.note-text');
  const deleteBtn = note.querySelector('.delete-btn');
  const duplicateBtn = note.querySelector('.duplicate-btn');
  const colorPicker = note.querySelector('.color-picker');

  titleEl.addEventListener('dblclick', (e) => {
    e.stopPropagation(); 

    const currentText = titleEl.innerText;
    const input = document.createElement('textarea');
    input.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    input.className = 'title-input';
    input.value = currentText;

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const saveText = () => {
      const newText = input.value.trim() || "Placeholder text";
      titleEl.innerText = newText;
      input.replaceWith(titleEl);
    };

    input.addEventListener('blur', saveText);
    input.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && evt.ctrlKey) {
        input.blur();
      }
      
      if (evt.key === 'Escape') {
        input.replaceWith(titleEl); 
      }
    });
  });

  colorPicker.addEventListener('input', (e) => {
    e.stopPropagation();
    note.style.backgroundColor = e.target.value;
  });
  
  colorPicker.addEventListener('mousedown', (e) => e.stopPropagation());

  deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  });

  duplicateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    duplicateNote(note.id);
  });
  duplicateBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  pin.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedPinNote) {
      selectedPinNote = note;
      pin.classList.add('active-pin');
    } else if (selectedPinNote === note) {
      cancelConnection();
    } else {
      addConnection(selectedPinNote.id, note.id);
      cancelConnection();
    }
  });
}

function deleteNote(noteId) {

  connections = connections.filter(c => c.fromId !== noteId && c.toId !== noteId);
  
  const note = document.getElementById(noteId);
  if (note) note.remove();

  renderConnections();
}  

function duplicateNote(noteId) {
  const note = document.getElementById(noteId);
  
  const titleEl = note.querySelector('.note-text');
  const txt = titleEl.innerText;    
  const centerWorld = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
  createNote({
    title: txt,
    color: note.style.backgroundColor,
    worldX: parseFloat(note.style.left)+50,
    worldY: parseFloat(note.style.top)+50
  });

  renderConnections();
}  


function addConnection(fromId, toId) {

  const exists = connections.some(c => 
    (c.fromId === fromId && c.toId === toId) || 
    (c.fromId === toId && c.toId === fromId)
  );

  if (!exists) {
    connections.push({
      id: `conn_${Date.now()}`,
      fromId,
      toId
    });
    renderConnections();
  }
  else
  {

    connections = connections.filter(c => !((c.fromId === fromId && c.toId === toId) || 
    (c.fromId === toId && c.toId === fromId)));
    renderConnections();
  }
}


function getPinCenter(noteEl) {
  const pin = noteEl.querySelector('.pin');
  

  const noteX = parseFloat(noteEl.style.left) || 0;
  const noteY = parseFloat(noteEl.style.top) || 0;


  const pinOffsetX = pin.offsetLeft + (pin.offsetWidth / 2);
  const pinOffsetY = pin.offsetTop + (pin.offsetHeight / 2);

  return {
    x: noteX + pinOffsetX,
    y: noteY + pinOffsetY
  };
}

function cancelConnection() {
  if (selectedPinNote) {
    selectedPinNote.querySelector('.pin').classList.remove('active-pin');
    selectedPinNote = null;
  }
}

function renderConnections() {

  svgLayer.querySelectorAll('line').forEach(el => {
    el.remove();
    });

  connections.forEach(conn => {
    const fromNote = document.getElementById(conn.fromId);
    const toNote = document.getElementById(conn.toId);
    
    if (!fromNote || !toNote) return;

    const p1 = getPinCenter(fromNote);
    const p2 = getPinCenter(toNote);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.className = "string-line";
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    line.setAttribute("stroke", "#101080");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("filter", "url(#shadow)");
 
    
    line.dataset.id = conn.id;

    svgLayer.appendChild(line);
  });
}  

/*function makeNoteDraggable(note) {
  note.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    activeNote = note;
    startMouse = { x: e.clientX, y: e.clientY };
    startNotePos = {
      x: parseFloat(note.style.left),
      y: parseFloat(note.style.top)
    };
  });
}*/


function makeNoteDraggable(note) {
  note.addEventListener('pointerdown', (e) => {
    // Ignore drag trigger if interacting with controls or editing text
    if (e.target.closest('.note-actions') || e.target.closest('.pin') || e.target.tagName === 'TEXTAREA') {
      return;
    }
    e.stopPropagation();
    activeNote = note;
    startMouse = { x: e.clientX, y: e.clientY };
    startNotePos = {
      x: parseFloat(note.style.left) || 0,
      y: parseFloat(note.style.top) || 0
    };
  });
}

function getBoardData() {
  const notes = Array.from(document.querySelectorAll('.note')).map(note => ({
    id: note.id,
    title: note.querySelector('.note-text')?.innerText || "Untitled",
    color: note.style.backgroundColor,
    x: parseFloat(note.style.left) || 0,
    y: parseFloat(note.style.top) || 0,
  }));

  return {
    version: 1,
    noteIdCounter,
    pan,
    zoom,
    notes,
    connections,
    filename
  };
}

function rgbToHex(rgb) {
  const values = rgb.match(/\d+/g);
  if (!values || values.length < 3) return null;

  return '#' + values.slice(0, 3)
    .map(x => parseInt(x, 10).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}  

function loadBoardData(data) {
  if (!data || !Array.isArray(data.notes)) return;

  nodesLayer.innerHTML = '';
  connections = [];
  cancelConnection();

  noteIdCounter = data.noteIdCounter || 0;
  if (data.pan) pan = { ...data.pan };
  if (data.zoom) zoom = data.zoom;
  if (data.filename) filename = data.filename;
  updateWorldTransform();

  data.notes.forEach(noteData => {
    const note = document.createElement('div');
    note.className = 'note';
    note.id = noteData.id;
    note.style.left = `${noteData.x}px`;
    note.style.top = `${noteData.y}px`;
    note.style.backgroundColor = noteData.color;
    const hexColor=noteData.color.trim().startsWith("rgb")?rgbToHex(noteData.color):noteData.color;

    note.innerHTML = noteInner(hexColor,noteData.id,noteData.title);

    nodesLayer.appendChild(note);
    makeNoteDraggable(note);
    attachNoteEditListeners(note);
  });

  connections = data.connections || [];
  renderConnections();
}  
  
function saveToLocalStorage() {
  const data = getBoardData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      loadBoardData(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse saved board state', e);
    }
  }
  else
  {
    newBoard();
  }
}

function newBoard()
{
  nodesLayer.innerHTML = '';
  connections = [];
  cancelConnection();

  noteIdCounter = 0;
  pan = { x: 0, y: 0 };
  zoom = 1;
  updateWorldTransform();

}

window.addEventListener('beforeunload', saveToLocalStorage);

addBtn.addEventListener('click', () => {

  const centerWorld = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
  createNote({
    title: "Placeholder text",
    worldX: centerWorld.x - 90,
    worldY: centerWorld.y - 50
  });
});


/*viewport.addEventListener('mousedown', (e) => {
  if (e.target.closest('.note')) return;
  isPanning = true;
  viewport.classList.add('panning');
  startMouse = { x: e.clientX, y: e.clientY };
  startPan = { ...pan };
});*/

viewport.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.note')) return;
  isPanning = true;
  viewport.classList.add('panning');
  startMouse = { x: e.clientX, y: e.clientY };
  startPan = { ...pan };
});

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = 0.05;
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  const worldX = (mouseX - pan.x) / zoom;
  const worldY = (mouseY - pan.y) / zoom;    

  if (e.deltaY < 0) {
    zoom = Math.min(zoom * (1 + zoomFactor), 3.0);
  } else {
    zoom = Math.max(zoom * (1 - zoomFactor), 0.2);
  }    
  
  const minpanx=window.innerWidth-10000*zoom;
  const minpany=window.innerHeight-10000*zoom;
  pan.x = clamp(mouseX - (worldX * zoom),minpanx,0);
  pan.y = clamp(mouseY - (worldY * zoom),minpany,0);


  updateWorldTransform();
}, { passive: false });

/*window.addEventListener('mousemove', (e) => {
  const dx = e.clientX - startMouse.x;
  const dy = e.clientY - startMouse.y;
  
  if(activeNote!=null)renderConnections();

  if (isPanning) {
    const minpanx=window.innerWidth-10000*zoom;
    const minpany=window.innerHeight-10000*zoom;
    pan.x = clamp(startPan.x + dx,minpanx,0);
    pan.y = clamp(startPan.y + dy,minpany,0);

    updateWorldTransform();
  } else if (activeNote) {
    activeNote.style.left = `${startNotePos.x + (dx / zoom)}px`;
    activeNote.style.top = `${startNotePos.y + (dy / zoom)}px`;
  }
});*/

window.addEventListener('pointermove', (e) => {
  if (!isPanning && !activeNote) return;

  const dx = e.clientX - startMouse.x;
  const dy = e.clientY - startMouse.y;
  
  if (activeNote != null) renderConnections();

  if (isPanning) {
    const minpanx = window.innerWidth - 10000 * zoom;
    const minpany = window.innerHeight - 10000 * zoom;
    pan.x = clamp(startPan.x + dx, minpanx, 0);
    pan.y = clamp(startPan.y + dy, minpany, 0);

    updateWorldTransform();
  } else if (activeNote) {
    activeNote.style.left = `${startNotePos.x + (dx / zoom)}px`;
    activeNote.style.top = `${startNotePos.y + (dy / zoom)}px`;
  }
});


/*window.addEventListener('mouseup', () => {
  isPanning = false;
  activeNote = null;
  viewport.classList.remove('panning');
});*/

const stopDraggingOrPanning = () => {
  isPanning = false;
  activeNote = null;
  viewport.classList.remove('panning');
};

window.addEventListener('pointerup', stopDraggingOrPanning);
window.addEventListener('pointercancel', stopDraggingOrPanning);


document.getElementById('save-board-btn').addEventListener('click', async () => {
  const data = getBoardData();
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
    });
    fileName = handle.name;
    const writable = await handle.createWritable();
    await writable.write(jsonStr);
    await writable.close();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error saving file:', err);
    }
  }
});

document.getElementById('load-board-btn').addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    filename = file.name;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        loadBoardData(data);
        saveToLocalStorage(); // Sync loaded state to local storage
      } catch (err) {
        alert('Invalid board file format.');
      }
    };
    reader.readAsText(file);
  });

  fileInput.click();
});

document.getElementById('new-board-btn').addEventListener('click', () => {
  newBoard();
});

updateWorldTransform();
loadFromLocalStorage();
