const BOARD_SIZE = 4;
const WORD_LENGTH = 4;
const FALLBACK_WORDS = ["able", "boat", "care", "gear"];
const READING_ORDER = {
  ROW: "row",
  COLUMN: "column",
  BOTH: "both",
  ANY: "any"
};
const FALLBACK_TILING = [
  {
    shape: "J/L",
    cells: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 }
    ]
  },
  {
    shape: "J/L",
    cells: [
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 1, col: 3 }
    ]
  },
  {
    shape: "O",
    cells: [
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 3, col: 2 },
      { row: 3, col: 3 }
    ]
  },
  {
    shape: "O",
    cells: [
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 3, col: 0 },
      { row: 3, col: 1 }
    ]
  }
];

const state = {
  board: [],
  selection: [],
  locked: new Map(),
  moves: [],
  activeMoveIndex: null,
  clickStartedOnSelectedTile: false,
  dragSelection: null,
  invalidSelection: false,
  invalidClearTimer: null,
  startedAt: null,
  completedAt: null,
  readingOrder: READING_ORDER.ROW,
  allowedWords: new Set(FALLBACK_WORDS),
  anagrams: buildAnagramMap(FALLBACK_WORDS),
  generatorWords: [...FALLBACK_WORDS],
  tilings: [FALLBACK_TILING],
  solution: []
};

const elements = {
  board: document.querySelector("#board"),
  selectionLines: document.querySelector("#selection-lines"),
  completionMessage: document.querySelector("#completion-message"),
  settingsButton: document.querySelector("#settings-button"),
  settingsPanel: document.querySelector("#settings-panel"),
  readingOrderInputs: document.querySelectorAll("input[name='reading-order']"),
  infoButton: document.querySelector("#info-button"),
  infoPanel: document.querySelector("#info-panel"),
  clearButton: document.querySelector("#clear-button"),
  resetButton: document.querySelector("#reset-button")
};

elements.settingsButton.addEventListener("click", toggleSettingsPanel);
elements.readingOrderInputs.forEach((input) => {
  input.addEventListener("change", updateReadingOrder);
});
elements.infoButton.addEventListener("click", toggleInfoPanel);
elements.clearButton.addEventListener("click", clearCurrentSelection);
elements.resetButton.addEventListener("click", resetGame);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("click", closePanelsFromOutside);
document.addEventListener("pointermove", handleDragMove);
document.addEventListener("pointerup", endDragSelection);
document.addEventListener("pointercancel", endDragSelection);

startGame();

async function startGame() {
  await loadGameData();
  generatePuzzle();
  render();
}

async function loadGameData() {
  const [allowedText, commonText, tilings] = await Promise.all([
    fetchText("data/allowed-words.txt"),
    fetchText("data/common-words.txt"),
    fetchJson("data/tetromino-tilings-4x4.json")
  ]);

  if (allowedText) {
    state.allowedWords = new Set(
      allowedText.split("\n").map((word) => word.trim()).filter(Boolean)
    );
    state.anagrams = buildAnagramMap(state.allowedWords);
  }

  if (commonText) {
    state.generatorWords = commonText.split("\n").map((word) => word.trim()).filter(Boolean);
  }

  if (Array.isArray(tilings) && tilings.length > 0) {
    state.tilings = tilings;
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url);
    return response.ok ? response.text() : null;
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function generatePuzzle() {
  const tiling = randomItem(state.tilings);
  const words = randomWordsForTiling(tiling);

  state.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
    id: cellId(Math.floor(index / BOARD_SIZE), index % BOARD_SIZE),
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
    letter: ""
  }));

  state.solution = tiling.map((piece, pieceIndex) => {
    const word = words[pieceIndex];
    const pieceReadingOrder = generationReadingOrder();
    const cells = piece.cells
      .map(({ row, col }) => getCell(row, col))
      .sort((a, b) => compareCellsForGeneration(a, b, pieceReadingOrder));
    const letters = generationLetters(word);

    cells.forEach((cell, letterIndex) => {
      cell.letter = letters[letterIndex].toUpperCase();
    });

    return {
      shape: piece.shape,
      word,
      readingOrder: pieceReadingOrder,
      cells: cells.map((cell) => cell.id)
    };
  });

  state.selection = [];
  state.locked.clear();
  state.moves = [];
  state.activeMoveIndex = null;
  state.clickStartedOnSelectedTile = false;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.startedAt = performance.now();
  state.completedAt = null;
  clearInvalidTimer();
}

function randomWordsForTiling(tiling) {
  const words = state.generatorWords;
  const chosen = new Set();

  return tiling.map(() => {
    if (chosen.size >= words.length) {
      return randomItem(words);
    }

    let word = randomItem(words);

    while (chosen.has(word)) {
      word = randomItem(words);
    }

    chosen.add(word);
    return word;
  });
}

function render() {
  elements.board.innerHTML = "";

  state.board.forEach((cell) => {
    const button = document.createElement("button");
    const lockedMoveIndex = state.locked.get(cell.id);

    button.type = "button";
    button.className = getTileClassName(cell, lockedMoveIndex);
    button.textContent = cell.letter;
    button.dataset.id = cell.id;
    button.setAttribute("aria-label", `${cell.letter} at row ${cell.row + 1}, column ${cell.col + 1}`);
    button.setAttribute("aria-disabled", String(lockedMoveIndex !== undefined));
    button.addEventListener("pointerdown", (event) => startDragSelection(cell, event));
    button.addEventListener("pointerenter", () => extendDragSelection(cell));
    button.addEventListener("pointerup", (event) => endDragSelection(event));
    button.addEventListener("pointercancel", (event) => endDragSelection(event));
    button.addEventListener("click", () => selectCell(cell));
    button.addEventListener("dblclick", () => handleTileDoubleClick(cell));

    elements.board.append(button);
  });

  renderSelectionLines();
}

function startDragSelection(cell, event) {
  if (event.detail === 1) {
    state.clickStartedOnSelectedTile = state.selection.includes(cell.id);
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (state.locked.has(cell.id) || state.selection.includes(cell.id)) {
    return;
  }

  state.dragSelection = {
    pointerId: event.pointerId,
    moved: false
  };

  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  addCellToSelection(cell);
}

function handleDragMove(event) {
  if (!state.dragSelection || state.dragSelection.pointerId !== event.pointerId) {
    return;
  }

  const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tile");

  if (!tile) {
    return;
  }

  const cell = getCellById(tile.dataset.id);

  if (cell) {
    extendDragSelection(cell);
  }
}

function extendDragSelection(cell) {
  if (!state.dragSelection || state.locked.has(cell.id)) {
    return;
  }

  state.dragSelection.moved = true;

  addCellToSelection(cell);
}

function endDragSelection(event) {
  if (!state.dragSelection || state.dragSelection.pointerId !== event.pointerId) {
    return;
  }

  state.dragSelection = null;
}

function getTileClassName(cell, lockedMoveIndex) {
  const classes = ["tile"];

  if (state.selection.includes(cell.id)) {
    classes.push("is-selected");
  }

  if (state.invalidSelection && state.selection.includes(cell.id)) {
    classes.push("is-invalid");
  }

  if (lockedMoveIndex !== undefined) {
    classes.push("is-locked", `lock-group-${lockedMoveIndex % 4}`);
  }

  return classes.join(" ");
}

function selectCell(cell) {
  if (state.dragSelection?.moved) {
    state.dragSelection = null;
    return;
  }

  if (state.locked.has(cell.id)) {
    return;
  }

  addCellToSelection(cell);
}

function addCellToSelection(cell) {
  if (state.invalidSelection) {
    return;
  }

  state.activeMoveIndex = null;

  if (state.selection.includes(cell.id) || state.selection.length >= WORD_LENGTH) {
    return;
  }

  state.selection.push(cell.id);

  if (state.selection.length === WORD_LENGTH) {
    state.dragSelection = null;
    finishSelection();
    return;
  }

  render();
}

function handleTileDoubleClick(cell) {
  if (state.locked.has(cell.id)) {
    activateCompletedGroupWithoutCell(cell.id);
    return;
  }

  deselectCellOnDoubleClick(cell);
}

function deselectCellOnDoubleClick(cell) {
  if (!state.clickStartedOnSelectedTile) {
    return;
  }

  const existingIndex = state.selection.indexOf(cell.id);

  if (existingIndex < 0) {
    return;
  }

  state.selection.splice(existingIndex, 1);
  state.clickStartedOnSelectedTile = false;
  render();
}

function finishSelection() {
  const result = validateSelection(state.selection);
  const word = resolveSelectionWord(state.selection);

  if (!result.valid || !word) {
    rejectSelection();
    return;
  }

  const moveIndex = state.moves.length;
  const cells = [...state.selection];

  cells.forEach((id) => state.locked.set(id, moveIndex));
  state.moves.push({ cells, word, shape: result.shape });
  state.selection = [];
  state.activeMoveIndex = null;
  if (state.locked.size === BOARD_SIZE * BOARD_SIZE) {
    state.completedAt = performance.now();
  }
  render();
}

function validateSelection(selection) {
  if (selection.length !== WORD_LENGTH) {
    return {
      valid: false,
      reason: `Choose exactly ${WORD_LENGTH} tiles.`,
      shape: "Incomplete"
    };
  }

  if (new Set(selection).size !== selection.length) {
    return {
      valid: false,
      reason: "A tile can only be used once in a selection.",
      shape: "Repeated tile"
    };
  }

  const cells = selection.map(getCellById);

  if (cells.some((cell) => state.locked.has(cell.id))) {
    return {
      valid: false,
      reason: "Locked tiles cannot be selected again.",
      shape: "Locked tile"
    };
  }

  if (!isEdgeConnected(cells)) {
    return {
      valid: false,
      reason: "Those four tiles are not edge-connected.",
      shape: "Disconnected"
    };
  }

  return {
    valid: true,
    reason: "Valid tetromino.",
    shape: classifyTetromino(cells)
  };
}

function isEdgeConnected(cells) {
  const ids = new Set(cells.map((cell) => cell.id));
  const seen = new Set([cells[0].id]);
  const stack = [cells[0]];

  while (stack.length > 0) {
    const current = stack.pop();

    neighborsOf(current)
      .filter((neighbor) => ids.has(neighbor.id) && !seen.has(neighbor.id))
      .forEach((neighbor) => {
        seen.add(neighbor.id);
        stack.push(neighbor);
      });
  }

  return seen.size === cells.length;
}

function classifyTetromino(cells) {
  const normalized = normalizeCells(cells);
  const signature = normalized.map(({ row, col }) => `${row},${col}`).join(";");

  const signatures = {
    "0,0;0,1;0,2;0,3": "I",
    "0,0;1,0;2,0;3,0": "I",
    "0,0;0,1;1,0;1,1": "O",
    "0,0;0,1;0,2;1,1": "T",
    "0,1;1,0;1,1;2,1": "T",
    "0,1;1,0;1,1;1,2": "T",
    "0,0;1,0;1,1;2,0": "T",
    "0,1;0,2;1,0;1,1": "S/Z",
    "0,0;1,0;1,1;2,1": "S/Z",
    "0,0;0,1;1,1;1,2": "S/Z",
    "0,1;1,0;1,1;2,0": "S/Z",
    "0,0;0,1;0,2;1,0": "J/L",
    "0,0;0,1;0,2;1,2": "J/L",
    "0,0;1,0;2,0;2,1": "J/L",
    "0,1;1,1;2,0;2,1": "J/L",
    "0,0;0,1;1,0;2,0": "J/L",
    "0,0;0,1;1,1;2,1": "J/L",
    "0,0;1,0;1,1;1,2": "J/L",
    "0,2;1,0;1,1;1,2": "J/L"
  };

  return signatures[signature] || "Tetromino";
}

function normalizeCells(cells) {
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));

  return cells
    .map((cell) => ({
      row: cell.row - minRow,
      col: cell.col - minCol
    }))
    .sort(compareCells);
}

function readSelectionWord(selection) {
  return sortCellsForReading(selection.map(getCellById), primaryReadingOrder())
    .map((cell) => cell.letter)
    .join("");
}

function isAllowedWord(word) {
  return state.allowedWords.has(word.toLowerCase());
}

function resolveSelectionWord(selection) {
  const cells = selection.map(getCellById);

  if (state.readingOrder === READING_ORDER.ANY) {
    const signature = anagramSignature(cells.map((cell) => cell.letter).join(""));
    return state.anagrams.get(signature)?.[0]?.toUpperCase() || null;
  }

  if (state.readingOrder === READING_ORDER.BOTH) {
    const rowWord = readCells(cells, READING_ORDER.ROW);

    if (isAllowedWord(rowWord)) {
      return rowWord;
    }

    const columnWord = readCells(cells, READING_ORDER.COLUMN);
    return isAllowedWord(columnWord) ? columnWord : null;
  }

  const word = readCells(cells, state.readingOrder);
  return isAllowedWord(word) ? word : null;
}

function readCells(cells, readingOrder) {
  return sortCellsForReading(cells, readingOrder)
    .map((cell) => cell.letter)
    .join("");
}

function renderSelectionLines() {
  elements.selectionLines.innerHTML = "";
  elements.selectionLines.classList.toggle("is-complete", isPuzzleComplete());

  state.moves.forEach((move, index) => {
    const row = document.createElement("button");

    row.type = "button";
    row.className = getSelectionRowClassName(index);
    row.setAttribute("aria-label", `Selection ${index + 1}: ${move.word}. Press Backspace to delete.`);
    row.addEventListener("click", () => selectMoveLine(index));
    row.addEventListener("dblclick", () => deleteMove(index));

    if (isPuzzleComplete()) {
      row.textContent = move.word.toUpperCase();
    } else {
      [...move.word].forEach((letter) => {
        row.append(makeMiniTile(letter, `lock-group-${index % 4}`));
      });
    }

    elements.selectionLines.append(row);
  });

  if (!isPuzzleComplete() && state.selection.length > 0) {
    const row = document.createElement("div");
    row.className = state.invalidSelection
      ? "selection-row is-current is-invalid"
      : "selection-row is-current";
    const displayWord = readCurrentSelectionDisplayWord();

    row.setAttribute("aria-label", `Current selection: ${displayWord}`);

    [...displayWord].forEach((letter) => {
      row.append(makeMiniTile(letter, "is-current"));
    });

    elements.selectionLines.append(row);
  }

  renderCompletionMessage();
}

function readCurrentSelectionDisplayWord() {
  return state.selection.length === WORD_LENGTH
    ? resolveSelectionWord(state.selection) || readSelectionWord(state.selection)
    : readSelectionWord(state.selection);
}

function makeMiniTile(letter, extraClassName) {
  const tile = document.createElement("span");

  tile.className = `mini-tile ${extraClassName}`;
  tile.textContent = letter;
  tile.setAttribute("aria-hidden", "true");

  return tile;
}

function getSelectionRowClassName(index) {
  const classes = ["selection-row", "is-complete"];

  if (state.activeMoveIndex === index) {
    classes.push("is-active");
  }

  return classes.join(" ");
}

function selectMoveLine(index) {
  state.selection = [];
  state.activeMoveIndex = state.activeMoveIndex === index ? null : index;
  render();
}

function deleteMove(index) {
  const deletedMove = state.moves[index];

  if (!deletedMove) {
    return;
  }

  state.moves.splice(index, 1);
  state.selection = [];
  state.activeMoveIndex = null;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.completedAt = null;
  clearInvalidTimer();
  rebuildLockedMap();
  render();
}

function clearCurrentSelection() {
  state.selection = [];
  state.locked.clear();
  state.moves = [];
  state.activeMoveIndex = null;
  state.clickStartedOnSelectedTile = false;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.completedAt = null;
  clearInvalidTimer();
  render();
}

function rejectSelection() {
  state.invalidSelection = true;
  state.dragSelection = null;
  clearInvalidTimer();
  render();

  state.invalidClearTimer = window.setTimeout(() => {
    state.selection = [];
    state.invalidSelection = false;
    state.invalidClearTimer = null;
    render();
  }, 360);
}

function clearInvalidTimer() {
  if (!state.invalidClearTimer) {
    return;
  }

  window.clearTimeout(state.invalidClearTimer);
  state.invalidClearTimer = null;
}

function activateCompletedGroupWithoutCell(cellId) {
  const moveIndex = state.locked.get(cellId);
  const move = state.moves[moveIndex];

  if (!move) {
    return;
  }

  state.moves.splice(moveIndex, 1);
  state.selection = move.cells.filter((id) => id !== cellId);
  state.activeMoveIndex = null;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.completedAt = null;
  clearInvalidTimer();
  rebuildLockedMap();
  render();
}

function resetGame() {
  generatePuzzle();
  render();
}

function updateReadingOrder(event) {
  state.readingOrder = event.target.value;
  generatePuzzle();
  render();
}

function toggleSettingsPanel(event) {
  event.stopPropagation();

  const isOpen = !elements.settingsPanel.hidden;

  elements.settingsPanel.hidden = isOpen;
  elements.settingsButton.setAttribute("aria-expanded", String(!isOpen));

  if (!isOpen) {
    closeInfoPanel();
  }
}

function toggleInfoPanel(event) {
  event.stopPropagation();

  const isOpen = !elements.infoPanel.hidden;

  elements.infoPanel.hidden = isOpen;
  elements.infoButton.setAttribute("aria-expanded", String(!isOpen));

  if (!isOpen) {
    closeSettingsPanel();
  }
}

function closePanelsFromOutside(event) {
  if (
    !elements.infoPanel.hidden &&
    !elements.infoPanel.contains(event.target) &&
    !elements.infoButton.contains(event.target)
  ) {
    closeInfoPanel();
  }

  if (
    !elements.settingsPanel.hidden &&
    !elements.settingsPanel.contains(event.target) &&
    !elements.settingsButton.contains(event.target)
  ) {
    closeSettingsPanel();
  }
}

function closeInfoPanel() {
  elements.infoPanel.hidden = true;
  elements.infoButton.setAttribute("aria-expanded", "false");
}

function closeSettingsPanel() {
  elements.settingsPanel.hidden = true;
  elements.settingsButton.setAttribute("aria-expanded", "false");
}

function handleKeydown(event) {
  if (event.key === "Escape" && (!elements.infoPanel.hidden || !elements.settingsPanel.hidden)) {
    closeInfoPanel();
    closeSettingsPanel();
    return;
  }

  if (event.key !== "Backspace") {
    return;
  }

  if (state.activeMoveIndex !== null) {
    event.preventDefault();
    deleteMove(state.activeMoveIndex);
    return;
  }

  if (state.selection.length > 0) {
    event.preventDefault();
    state.selection.pop();
    render();
  }
}

function rebuildLockedMap() {
  state.locked.clear();

  state.moves.forEach((move, moveIndex) => {
    move.cells.forEach((id) => state.locked.set(id, moveIndex));
  });
}

function renderCompletionMessage() {
  elements.completionMessage.innerHTML = "";

  if (!isPuzzleComplete()) {
    return;
  }

  const label = document.createElement("span");
  const time = document.createElement("strong");

  label.className = "completion-label";
  label.textContent = "Time";
  time.textContent = formatElapsedTime(state.completedAt - state.startedAt);

  elements.completionMessage.append(label, time);
}

function isPuzzleComplete() {
  return state.locked.size === BOARD_SIZE * BOARD_SIZE && state.completedAt !== null;
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function neighborsOf(cell) {
  return [
    getCell(cell.row - 1, cell.col),
    getCell(cell.row + 1, cell.col),
    getCell(cell.row, cell.col - 1),
    getCell(cell.row, cell.col + 1)
  ].filter(Boolean);
}

function getCell(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }

  return state.board[row * BOARD_SIZE + col];
}

function getCellById(id) {
  return state.board.find((cell) => cell.id === id);
}

function cellId(row, col) {
  return `${row}:${col}`;
}

function primaryReadingOrder() {
  return state.readingOrder === READING_ORDER.COLUMN
    ? READING_ORDER.COLUMN
    : READING_ORDER.ROW;
}

function generationReadingOrder() {
  if (state.readingOrder === READING_ORDER.COLUMN) {
    return READING_ORDER.COLUMN;
  }

  if (state.readingOrder === READING_ORDER.BOTH) {
    return Math.random() < 0.5 ? READING_ORDER.ROW : READING_ORDER.COLUMN;
  }

  return READING_ORDER.ROW;
}

function generationLetters(word) {
  return state.readingOrder === READING_ORDER.ANY
    ? shuffle([...word])
    : [...word];
}

function compareCellsForGeneration(a, b, readingOrder) {
  return readingOrder === READING_ORDER.COLUMN
    ? compareCellsByColumn(a, b)
    : compareCells(a, b);
}

function sortCellsForReading(cells, readingOrder) {
  return [...cells].sort(
    readingOrder === READING_ORDER.COLUMN ? compareCellsByColumn : compareCells
  );
}

function compareCells(a, b) {
  return a.row - b.row || a.col - b.col;
}

function compareCellsByColumn(a, b) {
  return a.col - b.col || a.row - b.row;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function buildAnagramMap(words) {
  const anagrams = new Map();

  words.forEach((word) => {
    const lowerWord = word.toLowerCase();
    const signature = anagramSignature(lowerWord);
    const existing = anagrams.get(signature) || [];

    existing.push(lowerWord);
    existing.sort();
    anagrams.set(signature, existing);
  });

  return anagrams;
}

function anagramSignature(word) {
  return [...word.toLowerCase()].sort().join("");
}
