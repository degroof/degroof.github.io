const minZoom = 0.1;
const maxZoom = 2.0;

let pan = { x: 0, y: 0 }; //upper left of world
let zoom = 1;  //magnification
let isPanning = false; //true if world is being dragged
let activeNote = null; //note being dragged
let filename = "stringboard-untitled.json"; //last used filename
let currentFileHandle = null; //handle to remember last load location

let startMouse = { x: 0, y: 0 };  //staring point of drag operation
let startPan = { x: 0, y: 0 }; //last pan offsets
let startNotePos = { x: 0, y: 0 }; //start of note drag

const svgLayer = document.getElementById('svg-layer');  //layer for strings
const viewport = document.getElementById('viewport'); //main viewport div
const world = document.getElementById('world'); //draggable & zoomable world div
const nodesLayer = document.getElementById('nodes-layer'); //layer for notes
const addBtn = document.getElementById('add-note-btn'); //add note button
const saveBtn = document.getElementById('save-board-btn'); //save button
const loadBtn = document.getElementById('load-board-btn'); //load button
const newBtn = document.getElementById('new-board-btn'); //new button

const STORAGE_KEY = 'stringboard_state_v1';  //local storage name

let connections = [];       // { id, fromId, toId }
let selectedPinNote = null;  // "from" pin's note

let noteIdCounter = 0; //counter for adding notes

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);  //restrict value between min and max

//pinch and zoom stuff
const activePointers = new Map();
let initialPinchDistance = null;
let initialZoom = 1;
let initialPan = { x: 0, y: 0 };
let initialPinchCenter = { x: 0, y: 0 };

//note resize stuff
let resizeOffset = { dx: 0, dy: 0 };
let resizingNote = null;

//ask before overwriting
let isDirty = false;

function markDirty() {
  isDirty = true;
}

function clearDirty() {
  isDirty = false;
}

//check if dirty
function checkUnsavedChanges(onProceed) {
  if (!isDirty) {
    onProceed();
    return;
  }

  const modal = document.getElementById('confirm-modal');
  modal.classList.remove('hidden');

  const saveBtn = document.getElementById('modal-save-btn');
  const discardBtn = document.getElementById('modal-discard-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');

  const cleanup = () => {
    modal.classList.add('hidden');
    saveBtn.replaceWith(saveBtn.cloneNode(true));
    discardBtn.replaceWith(discardBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  };

  document.getElementById('modal-save-btn').addEventListener('click', async () => {
    cleanup();
    await saveBoardToFile();
    if (!isDirty) onProceed();
  });

  document.getElementById('modal-discard-btn').addEventListener('click', () => {
    cleanup();
    clearDirty();
    onProceed();
  });

  document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    cleanup();
  });
}

//set the transform of the world div
function updateWorldTransform() {
  world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  clipObjects();
  renderConnections();
}

//convert screen X,Y to world coordinates
function screenToWorld(clientX, clientY) {
  return {
    x: (clientX - pan.x) / zoom,
    y: (clientY - pan.y) / zoom
  };
}

//convert world X,Y to screen coordinates
function worldToScreen(worldX, worldY) {
  return {
    x: worldX * zoom + pan.x,
    y: worldY * zoom + pan.y
  };
}

//generate the inner html for a note
function noteInner(hexColor, noteId) {
  return `
      <div class="note-actions">
        <button class="edit-btn" title="Edit Text">&#x270E;</button>
        <button class="chk-btn" title="Finish Editing">&#x2713;</button>
        <input type="color" class="color-picker" value="${hexColor}" title="Change Note Color" />
        <button class="delete-btn" title="Delete Note">&times;</button>
        <button class="duplicate-btn" title="Duplicate Note">+</button>
      </div>

      <div class="pin" data-note-id="${noteId}" title="Click to connect/disconnect string"></div>

      <div class="note-text" title="Double-click to edit"></div>
      <button class="note-resize">&#8991;</button>
    `; 
}

//create a new note
function createNote({ title = "Placeholder text", color = "#FFFF80", worldX = 200, worldY = 200, width = 250, height = 250 }) {
  const noteId = `note_${++noteIdCounter}`;
  const note = document.createElement('div');
  note.className = 'note';
  note.id = noteId;
  note.style.left = `${worldX}px`;
  note.style.top = `${worldY}px`;
  note.style.width = `${width}px`;
  note.style.height = `${height}px`;
  note.style.backgroundColor = color;
  const hexColor = color.trim().startsWith("rgb") ? rgbToHex(color) : color;

  note.innerHTML = noteInner(hexColor, noteId);
  note.querySelector('.note-text').textContent = title;

  nodesLayer.appendChild(note);

  makeNoteDraggable(note);
  attachNoteEditListeners(note);
}

//set listeners on a note
function attachNoteEditListeners(note) {
  const pin = note.querySelector('.pin');
  const titleEl = note.querySelector('.note-text');
  const deleteBtn = note.querySelector('.delete-btn');
  const duplicateBtn = note.querySelector('.duplicate-btn');
  const editBtn = note.querySelector('.edit-btn');
  const chkBtn = note.querySelector('.chk-btn');
  const colorPicker = note.querySelector('.color-picker');
  const noteResize = note.querySelector('.note-resize');

  titleEl.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    editBtn.style.display='none';
    chkBtn.style.display='block';
    const currentText = titleEl.innerText;
    const input = document.createElement('textarea');
    input.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });

    input.className = 'title-input';
    input.value = currentText;

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const saveText = () => {
      const newText = input.value.trim() || "Placeholder text";
      if(newText!=currentText) markDirty();
      titleEl.innerText = newText;
      input.replaceWith(titleEl);
      editBtn.style.display='block';
      chkBtn.style.display='none';
    };

    input.addEventListener('blur', saveText);
    input.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && evt.ctrlKey) {
        input.blur();
      }
    });
  });


  colorPicker.addEventListener('input', (e) => {
    e.stopPropagation();
    note.style.backgroundColor = e.target.value;
  });
  
  colorPicker.addEventListener('pointerdown', (e) => e.stopPropagation());

  deleteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  });

  duplicateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    duplicateNote(note.id);
  });
  duplicateBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

  editBtn.addEventListener('click', (e) => {
      const clickEvent = document.createEvent("MouseEvents");
      clickEvent.initEvent("dblclick", true, true);
      titleEl.dispatchEvent(clickEvent);
  });
  editBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

  makeNoteResizeable(noteResize);

  pin.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedPinNote) {
      selectedPinNote = note;
      pin.classList.add('active-pin');
    } else if (selectedPinNote === note) {
      cancelConnection();
    } else {
      addConnection(selectedPinNote.id, note.id);
      markDirty();
      cancelConnection();
    }
  });
}

//delete a note
function deleteNote(noteId) {
  connections = connections.filter(c => c.fromId !== noteId && c.toId !== noteId);
  const note = document.getElementById(noteId);
  if (note) note.remove();
  markDirty();
  renderConnections();
}  

//create a duplicate of the note and place it down and to the right
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
  markDirty();
  renderConnections();
}  

//add a connection between 2 pins
//if one already exists, remove it
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

//get the coordinates of the pin for a note
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

//remove highlight on "from" pin
function cancelConnection() {
  if (selectedPinNote) {
    selectedPinNote.querySelector('.pin').classList.remove('active-pin');
    selectedPinNote = null;
  }
}

//draw the strings and pins
function renderConnections() {
  svgLayer.querySelectorAll('line, circle').forEach(el => el.remove());
  const margin = 500;

  //run through connections and draw a line for each if it's inside the viewport
  connections.forEach(conn => {
    const fromNote = document.getElementById(conn.fromId);
    const toNote = document.getElementById(conn.toId);
    if (!fromNote || !toNote) return;

    const p1World = getPinCenter(fromNote);
    const p2World = getPinCenter(toNote);

    const p1 = worldToScreen(p1World.x, p1World.y);
    const p2 = worldToScreen(p2World.x, p2World.y);

    //skip line it fully outside viewport
    const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y), maxY = Math.max(p1.y, p2.y);
    if (maxX < -margin || minX > window.innerWidth + margin ||
        maxY < -margin || minY > window.innerHeight + margin) {
      return;
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.className = "string-line";
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    line.setAttribute("stroke", "#101080");
    line.setAttribute("stroke-width", 3 * zoom);
    line.setAttribute("filter", "url(#shadow)");
    svgLayer.appendChild(line);
  });

  //run through the notes and render a pin head for each if it's inside the viewport
  nodesLayer.querySelectorAll('.note').forEach(note => {
    const pc = getPinCenter(note);
    const pinCenter = worldToScreen(pc.x,pc.y);
    //skip if fully outside
    if (pinCenter.x < -margin || pinCenter.x > window.innerWidth + margin ||
        pinCenter.y < -margin || pinCenter.y > window.innerHeight + margin) {
      return;
    }
    const cir = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cir.setAttribute("cx", pinCenter.x);
    cir.setAttribute("cy", pinCenter.y);
    cir.setAttribute("r", 8 * zoom);
    cir.setAttribute("fill", "url(#redSphere)");
    svgLayer.appendChild(cir);
  });
}

//start a note drag
function makeNoteDraggable(note) {
  note.addEventListener('pointerdown', (e) => {
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

//start a note resize
function makeNoteResizeable(corner) {
  corner.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    resizingNote = corner.parentNode;
    const initialPosWorld = screenToWorld(e.clientX,e.clientY);
    const initialSize = {w: parseFloat(resizingNote.style.width), h: parseFloat(resizingNote.style.height)};
    const initialNotePosition = {x: parseFloat(resizingNote.style.left), y: parseFloat(resizingNote.style.top)};
    resizeOffset = {dx: initialNotePosition.x - initialPosWorld.x + initialSize.w, dy: initialNotePosition.y - initialPosWorld.y + initialSize.h};
  });
}

//get data for board storage
function getBoardData() {
  const notes = Array.from(document.querySelectorAll('.note')).map(note => ({
    id: note.id,
    title: note.querySelector('.note-text')?.innerText || "Untitled",
    color: note.style.backgroundColor,
    x: parseFloat(note.style.left) || 0,
    y: parseFloat(note.style.top) || 0,
    w: note.offsetWidth,
    h: note.offsetHeight
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

//convert color rgb string to hex string
function rgbToHex(rgb) {
  const values = rgb.match(/\d+/g);
  if (!values || values.length < 3) return null;

  return '#' + values.slice(0, 3)
    .map(x => parseInt(x, 10).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}  

//render board from data 
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
    note.style.width = `${noteData.w}px`;
    note.style.height = `${noteData.h}px`;
    note.style.backgroundColor = noteData.color;
    const hexColor = noteData.color.trim().startsWith("rgb") ? rgbToHex(noteData.color) : noteData.color;

    note.innerHTML = noteInner(hexColor, noteData.id);
    note.querySelector('.note-text').textContent = noteData.title;

    nodesLayer.appendChild(note);
    makeNoteDraggable(note);
    attachNoteEditListeners(note);
  });

  connections = data.connections || [];
  renderConnections();
}  
 
//save board state to browser storage
function saveToLocalStorage() {
  const data = getBoardData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

//load board state from browser storage
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

//clear the board
function newBoard()
{
  nodesLayer.innerHTML = '';
  connections = [];
  cancelConnection();

  noteIdCounter = 0;
  pan = { x: 0, y: 0 };
  zoom = 1;

  filename = "stringboard-untitled.json";
  currentFileHandle = null;
  clearDirty();
  updateWorldTransform();
  renderConnections();
}

//autosave
window.addEventListener('beforeunload', saveToLocalStorage);

//add a new note
addBtn.addEventListener('click', () => {
  const centerWorld = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
  createNote({
    title: "Placeholder text",
    worldX: centerWorld.x - 90,
    worldY: centerWorld.y - 50
  });
  markDirty();
  updateWorldTransform();
  renderConnections();
});

//start panning
viewport.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.note')) return;
  isPanning = true;
  viewport.classList.add('panning');
  startMouse = { x: e.clientX, y: e.clientY };
  startPan = { ...pan };
});

//touch has started; could be mouse or beginning of multi-touch
window.addEventListener('pointerdown', (e) => {
  activePointers.set(e.pointerId, e);
  //if multi-touch, stop panning and dragging
  if (activePointers.size >= 2) {
    isPanning = false;
    activeNote = null;
    viewport.classList.remove('panning');
    //if exactly 2 touch points, start pinching
    if (activePointers.size === 2) {
      const [p1, p2] = Array.from(activePointers.values());
      initialPinchDistance = getDistance(p1, p2);
      initialZoom = zoom;
      initialPan = { ...pan };
      initialPinchCenter = getCenter(p1, p2);
    }
  }
}, { capture: true });

//zoom in / out (desktop)
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = 0.05;
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  const worldX = (mouseX - pan.x) / zoom;
  const worldY = (mouseY - pan.y) / zoom;    

  if (e.deltaY < 0) {
    zoom = Math.min(zoom * (1 + zoomFactor), maxZoom);
  } else {
    zoom = Math.max(zoom * (1 - zoomFactor), minZoom);
  }    
  
  pan.x = mouseX - (worldX * zoom);
  pan.y = mouseY - (worldY * zoom);

  updateWorldTransform();
}, { passive: false });

//drag, pan or pinch
window.addEventListener('pointermove', (e) => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, e);
  }

  //multi-touch, so pinch
  if (activePointers.size === 2 && initialPinchDistance) {
    e.preventDefault();
    const [p1, p2] = Array.from(activePointers.values());
    const currentDistance = getDistance(p1, p2);
    const currentCenter = getCenter(p1, p2);

    if (initialPinchDistance > 0) {
      const scaleFactor = currentDistance / initialPinchDistance;
      const newZoom = clamp(initialZoom * scaleFactor, minZoom, maxZoom);

      // Focal point math based on initial center point
      const worldX = (initialPinchCenter.x - initialPan.x) / initialZoom;
      const worldY = (initialPinchCenter.y - initialPan.y) / initialZoom;

      zoom = newZoom;
      pan.x = currentCenter.x - (worldX * zoom);
      pan.y = currentCenter.y - (worldY * zoom);

      updateWorldTransform();
    }
    return; //skip pan & drag when pinching
  }

  //single touch, so do drag or pan or resize if active
  if (!isPanning && !activeNote && !resizingNote) return;
  markDirty();
  const dx = e.clientX - startMouse.x;
  const dy = e.clientY - startMouse.y;

  if (activeNote != null) renderConnections();

  if (isPanning) {
    pan.x = startPan.x + dx;
    pan.y = startPan.y + dy;
    updateWorldTransform();
  } else if (activeNote) {
    activeNote.style.left = `${startNotePos.x + (dx / zoom)}px`;
    activeNote.style.top = `${startNotePos.y + (dy / zoom)}px`;
  } else if (resizingNote) {
    const notePos = {x: parseFloat(resizingNote.style.left), y: parseFloat(resizingNote.style.top)};
    const mousePos = screenToWorld(e.clientX,e.clientY);
    const newSize = {w: mousePos.x - notePos.x + resizeOffset.dx, h: mousePos.y - notePos.y + resizeOffset.dy};
    resizingNote.style.width = `${newSize.w}px`;
    resizingNote.style.height = `${newSize.h}px`;
    renderConnections();
 }
});

//end of panning or dragging
const stopDraggingOrPanning = () => {
  isPanning = false;
  activeNote = null;
  viewport.classList.remove('panning');
  resizingNote = null;
};

//remove a pointer; if no longer multi-touch, stop pinch
const removePointer = (e) => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) {
    initialPinchDistance = null;
  }
};

//one touch ended, so remove pointer and stop dragging & panning if active
window.addEventListener('pointerup', (e) => {
  removePointer(e);
  stopDraggingOrPanning();
  saveToLocalStorage();
});

//one touch ended, so remove pointer and stop dragging & panning if active
window.addEventListener('pointercancel', (e) => {
  removePointer(e);
  stopDraggingOrPanning();
});

//save board to file
async function saveBoardToFile()
{
  const data = getBoardData();
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    const options = {
      suggestedName: filename,
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
    };

    if (currentFileHandle) {
      options.startIn = currentFileHandle;
    }

    const handle = await window.showSaveFilePicker(options);
    currentFileHandle = handle;
    filename = handle.name;

    const writable = await handle.createWritable();
    await writable.write(jsonStr);
    await writable.close();
    clearDirty();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error saving file:', err);
    }
  }
}

saveBtn.addEventListener('click', async () => {
  saveBoardToFile();
});

loadBtn.addEventListener('click', () => {
  checkUnsavedChanges(async () => {
    await executeLoadFromFile();
    clearDirty();
  });
});

//load board from file
async function executeLoadFromFile() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
      multiple: false
    });

    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);

    currentFileHandle = handle;
    filename = handle.name;
    data.filename = filename;

    loadBoardData(data);
    clearDirty();
    saveToLocalStorage();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error loading file:', err);
    }
  }
};

//create new board
newBtn.addEventListener('click', () => {
  checkUnsavedChanges(() => {
    newBoard();
    clearDirty();
  });
});

//get the distance between 2 pointers
function getDistance(p1, p2) {
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.hypot(dx, dy);
}

//get the center point between 2 pointers
function getCenter(p1, p2) {
  return {
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2
  };
}

//make objects outside viewport invisible
function clipObjects() {
  //get world coords for viewport
  const topLeftWorld = screenToWorld(0, 0);
  const bottomRightWorld = screenToWorld(window.innerWidth, window.innerHeight);

  const viewRect = {
    left: topLeftWorld.x,
    top: topLeftWorld.y,
    right: bottomRightWorld.x,
    bottom: bottomRightWorld.y
  };

  //run through notes, setting the visibility for each
  nodesLayer.querySelectorAll('.note').forEach(note => {
    //size and position of note
    const nx = parseFloat(note.style.left) || 0;
    const ny = parseFloat(note.style.top) || 0;
    const nw = note.offsetWidth;
    const nh = note.offsetHeight;

    //check if any part of it is inside
    const isVisible = !(
      nx + nw < viewRect.left ||
      nx > viewRect.right ||
      ny + nh < viewRect.top ||
      ny > viewRect.bottom
    );

    note.style.display = isVisible ? 'flex' : 'none';
  });
}

//initialize
updateWorldTransform();
loadFromLocalStorage();
