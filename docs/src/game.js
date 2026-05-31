const DEFAULT_WORD_LENGTH = 4;
const GROUP_COLOR_COUNT = 9;
const SESSION_STORAGE_KEY = "tilexicon.currentPuzzle";
const CHEAT_CODE = ["q", "q", "q"];
const DOUBLE_TAP_MS = 320;
const INTRO_PHRASES = [
  ["find", "each", "word", "here"],
  ["each", "tile", "must", "link"]
];
const WORD_LENGTH_CUE_SHAPES = new Map();
const CONFIG = window.TilexiconConfig || {};
const URL_FLAGS = new URLSearchParams(window.location.search);
const ENABLE_6X6 = CONFIG.enable6x6 !== false || parseUrlBoolean(URL_FLAGS.get("enable6x6"), false);
const MODES = {
  4: {
    wordLength: 4,
    wordLabel: "four-letter",
    tilingKind: "tetromino",
    allowedWordsUrl: "data/allowed-words.txt",
    commonWordsUrl: "data/common-words.txt",
    tilingPrefix: "tetromino",
    boardSizes: [
      { rows: 4, cols: 4, label: "4 x 4" },
      { rows: 4, cols: 5, label: "4 x 5" },
      { rows: 5, cols: 4, label: "5 x 4" },
      { rows: 4, cols: 6, label: "4 x 6" },
      { rows: 6, cols: 4, label: "6 x 4" },
      { rows: 6, cols: 6, label: "6 x 6" }
    ]
  },
  5: {
    wordLength: 5,
    wordLabel: "five-letter",
    tilingKind: "pentomino",
    allowedWordsUrl: "data/allowed-words-5.txt",
    commonWordsUrl: "data/common-words-5.txt",
    tilingPrefix: "pentomino",
    boardSizes: [
      { rows: 4, cols: 5, label: "4 x 5" },
      { rows: 5, cols: 4, label: "5 x 4" },
      { rows: 5, cols: 5, label: "5 x 5" },
      { rows: 5, cols: 6, label: "5 x 6" },
      { rows: 6, cols: 5, label: "6 x 5" }
    ]
  }
};
const DEFAULT_SIZE = modeBoardSizes(DEFAULT_WORD_LENGTH)[0];
const FALLBACK_TILINGS = {
  "4x4": ["0000111122223333"]
};
const FALLBACK_WORDS = ["able", "boat", "care", "gear"];
const READING_ORDER = {
  ROW: "row",
  COLUMN: "column",
  BOTH: "both",
  ANY: "any"
};
const TIMER_MODE = {
  TIMED: "timed",
  UNTIMED: "untimed"
};
const state = {
  wordLength: DEFAULT_WORD_LENGTH,
  rows: DEFAULT_SIZE.rows,
  cols: DEFAULT_SIZE.cols,
  board: [],
  selection: [],
  locked: new Map(),
  moves: [],
  activeMoveIndex: null,
  clickStartedOnSelectedTile: false,
  lastSelectionTap: null,
  lastLockedTap: null,
  dragSelection: null,
  invalidSelection: false,
  invalidClearTimer: null,
  cheatIndex: 0,
  solvedWithHelp: false,
  wordLengthCueCells: [],
  wordLengthCueColorIndex: 0,
  isIntro: false,
  startedAt: null,
  completedAt: null,
  readingOrder: READING_ORDER.ROW,
  strictMode: false,
  timerMode: TIMER_MODE.TIMED,
  allowedWords: new Set(FALLBACK_WORDS),
  anagrams: buildAnagramMap(FALLBACK_WORDS),
  preferredAnagrams: buildAnagramMap(FALLBACK_WORDS),
  generatorWords: [...FALLBACK_WORDS],
  modeData: {
    4: {
      allowedWords: new Set(FALLBACK_WORDS),
      anagrams: buildAnagramMap(FALLBACK_WORDS),
      preferredAnagrams: buildAnagramMap(FALLBACK_WORDS),
      generatorWords: [...FALLBACK_WORDS],
      tilingsBySize: { ...FALLBACK_TILINGS }
    },
    5: {
      allowedWords: new Set(),
      anagrams: buildAnagramMap([]),
      preferredAnagrams: buildAnagramMap([]),
      generatorWords: [],
      tilingsBySize: {}
    }
  },
  solution: []
};

const elements = {
  playArea: document.querySelector(".play-area"),
  board: document.querySelector("#board"),
  selectionLines: document.querySelector("#selection-lines"),
  completionMessage: document.querySelector("#completion-message"),
  settingsButton: document.querySelector("#settings-button"),
  settingsPanel: document.querySelector("#settings-panel"),
  settingsSummary: document.querySelector("#settings-summary"),
  boardSizeInputs: document.querySelectorAll("input[name='board-size']"),
  readingOrderInputs: document.querySelectorAll("input[name='reading-order']"),
  strictModeInput: document.querySelector("#strict-mode"),
  timerModeInput: document.querySelector("#untimed-mode"),
  infoButton: document.querySelector("#info-button"),
  infoPanel: document.querySelector("#info-panel"),
  shareButton: document.querySelector("#share-button"),
  modeSwitchButton: document.querySelector("#mode-switch-button"),
  keyboardPanel: document.querySelector("#keyboard-panel"),
  printPanel: document.querySelector("#print-panel"),
  printGrid: document.querySelector("#print-grid"),
  restartButton: document.querySelector("#restart-button"),
  newButton: document.querySelector("#new-button"),
  fiveLetterButton: document.querySelector("#five-letter-button"),
  title: document.querySelector("#title"),
  ruleWordLength: document.querySelector("#rule-word-length"),
  ruleTileCount: document.querySelector("#rule-tile-count"),
  exampleValidStraight: document.querySelector("#example-valid-straight"),
  exampleValidBent: document.querySelector("#example-valid-bent"),
  exampleInvalidDisconnected: document.querySelector("#example-invalid-disconnected"),
  exampleInvalidOrder: document.querySelector("#example-invalid-order")
};

configureBoardSizeControls();
elements.settingsButton.addEventListener("click", toggleSettingsPanel);
elements.boardSizeInputs.forEach((input) => {
  input.addEventListener("change", updateBoardSize);
});
elements.readingOrderInputs.forEach((input) => {
  input.addEventListener("change", updateReadingOrder);
});
elements.strictModeInput.addEventListener("change", updateStrictMode);
elements.timerModeInput.addEventListener("change", updateTimerMode);
elements.infoButton.addEventListener("click", toggleInfoPanel);
elements.shareButton.addEventListener("click", copyPuzzleToClipboard);
elements.modeSwitchButton.addEventListener("click", switchWordLengthMode);
elements.restartButton.addEventListener("click", restartGame);
elements.newButton.addEventListener("click", startNewGame);
elements.fiveLetterButton.addEventListener("click", startFiveLetterGame);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("click", closePanelsFromOutside);
document.addEventListener("pointermove", handleDragMove);
document.addEventListener("pointerup", endDragSelection);
document.addEventListener("pointercancel", endDragSelection);
window.addEventListener("resize", render);

startGame();

function configureBoardSizeControls() {
  elements.boardSizeInputs.forEach((input) => {
    const size = parseSizeKey(input.value);
    const isAvailable = size !== null;

    input.disabled = !isAvailable;
    input.closest("label").hidden = !isAvailable;
  });
}

async function startGame() {
  await loadGameData();
  if (!loadPuzzleFromUrl()) {
    showIntroPuzzle();
  }
  render();
}

async function loadGameData() {
  await Promise.all(Object.values(MODES).map(loadModeData));
  applyModeData();

  updateSettingsSummary();
}

async function loadModeData(mode) {
  const tilingSizes = canonicalBoardSizes(mode.wordLength);
  const tilingRequests = tilingSizes.map((size) =>
    fetchText(`data/${mode.tilingPrefix}-tilings-${canonicalSizeKey(size.rows, size.cols)}.txt`)
  );
  const [allowedText, commonText, ...tilingTexts] = await Promise.all([
    fetchText(mode.allowedWordsUrl),
    fetchText(mode.commonWordsUrl),
    ...tilingRequests
  ]);
  const modeData = state.modeData[mode.wordLength];
  const allowedWords = parseWordList(allowedText);
  const commonWords = parseWordList(commonText);

  if (allowedWords.length > 0 || commonWords.length > 0) {
    modeData.allowedWords = new Set([...allowedWords, ...commonWords]);
    modeData.anagrams = buildAnagramMap(modeData.allowedWords);
  }

  if (commonWords.length > 0) {
    modeData.generatorWords = commonWords;
    modeData.preferredAnagrams = buildAnagramMap(modeData.generatorWords);
  }

  tilingTexts.forEach((text, index) => {
    const tilings = parseTilingText(text);

    if (tilings.length > 0) {
      const { rows, cols } = tilingSizes[index];
      storeTilings(mode.wordLength, rows, cols, tilings);
    }
  });
}

function canonicalBoardSizes(wordLength = state.wordLength) {
  return modeBoardSizes(wordLength)
    .filter((size) => size.rows <= size.cols)
    .filter((size, index, sizes) => (
      sizes.findIndex((other) => other.rows === size.rows && other.cols === size.cols) === index
    ));
}

function storeTilings(wordLength, rows, cols, tilings) {
  state.modeData[wordLength].tilingsBySize[sizeKey(rows, cols)] = tilings;

  if (rows !== cols && isSupportedSize(cols, rows, wordLength)) {
    state.modeData[wordLength].tilingsBySize[sizeKey(cols, rows)] = tilings.map((tiling) =>
      transposeTiling(tiling, rows, cols)
    );
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

function parseTilingText(text) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseWordList(text) {
  return (text || "")
    .split("\n")
    .map((word) => word.trim())
    .filter(Boolean);
}

function generatePuzzle() {
  state.isIntro = false;
  const tilings = currentTilings();

  if (tilings.length === 0) {
    setBoardDimensions(defaultSize().rows, defaultSize().cols);
  }

  const tiling = randomItem(currentTilings());
  const pieces = compactTilingToPieces(tiling);
  const words = randomWordsForTiling(pieces);

  state.board = Array.from({ length: boardCellCount() }, (_, index) => ({
    id: cellId(Math.floor(index / state.cols), index % state.cols),
    row: Math.floor(index / state.cols),
    col: index % state.cols,
    letter: ""
  }));

  state.solution = pieces.map((piece, pieceIndex) => {
    const word = words[pieceIndex];
    const pieceReadingOrder = generationReadingOrder();
    const cells = piece
      .map((id) => getCellById(id))
      .sort((a, b) => compareCellsForGeneration(a, b, pieceReadingOrder));
    const letters = generationLetters(word);

    cells.forEach((cell, letterIndex) => {
      cell.letter = letters[letterIndex].toUpperCase();
    });

    return {
      shape: classifyPolyomino(cells),
      word,
      readingOrder: pieceReadingOrder,
      cells: cells.map((cell) => cell.id)
    };
  });

  resetProgress();
  saveCurrentPuzzle();
}

function showIntroPuzzle() {
  const words = randomItem(INTRO_PHRASES);

  setWordLength(DEFAULT_WORD_LENGTH);
  setBoardDimensions(4, 4);
  syncSettingsControls();
  state.board = Array.from({ length: boardCellCount() }, (_, index) => ({
    id: cellId(Math.floor(index / state.cols), index % state.cols),
    row: Math.floor(index / state.cols),
    col: index % state.cols,
    letter: ""
  }));

  const tiling = randomItem(state.modeData[4].tilingsBySize["4x4"] || FALLBACK_TILINGS["4x4"]);
  const pieces = compactTilingToPieces(tiling);

  state.solution = pieces.map((piece, index) => {
    const word = words[index];
    const cells = piece
      .map((id) => getCellById(id))
      .sort(compareCells);

    [...word.toUpperCase()].forEach((letter, letterIndex) => {
      cells[letterIndex].letter = letter;
    });

    return {
      cells: cells.map((cell) => cell.id),
      word,
      shape: classifyPolyomino(cells)
    };
  });
  resetProgress();
  state.moves = state.solution.map((move) => ({
    cells: [...move.cells],
    word: move.word,
    shape: move.shape
  }));
  rebuildLockedMap();
  state.isIntro = true;
  state.completedAt = Date.now();
}

function currentTilings() {
  return state.modeData[state.wordLength].tilingsBySize[currentSizeKey()] || [];
}

function compactTilingToPieces(tiling) {
  const pieces = Array.from({ length: pieceCount() }, () => []);

  [...tiling].forEach((label, index) => {
    const pieceIndex = parseInt(label, 36);

    if (pieces[pieceIndex]) {
      pieces[pieceIndex].push(cellId(Math.floor(index / state.cols), index % state.cols));
    }
  });

  return pieces;
}

function transposeTiling(tiling, rows, cols) {
  const transposed = Array.from({ length: tiling.length });

  [...tiling].forEach((label, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    transposed[col * rows + row] = label;
  });

  return transposed.join("");
}

function loadPuzzleFromUrl() {
  applyUrlSize();
  const letters = readUrlGrid();

  if (!letters) {
    return false;
  }

  applyUrlSettings();
  state.isIntro = false;
  state.board = makeBoardFromLetters(letters);
  state.solution = readUrlSolution(letters);
  syncSettingsControls();
  resetProgress();
  saveCurrentPuzzle();
  return true;
}

function readUrlGrid() {
  const params = new URLSearchParams(window.location.search);
  const grid = params.get("grid");

  if (!grid || !new RegExp(`^[a-z]{${boardCellCount()}}$`, "i").test(grid)) {
    return null;
  }

  return grid.toUpperCase();
}

function applyUrlSize() {
  const params = new URLSearchParams(window.location.search);
  const wordLength = readUrlWordLength(params);
  const size = parseSizeKey(params.get("size"), wordLength);

  setWordLength(wordLength);
  setBoardDimensions(size?.rows || defaultSize().rows, size?.cols || defaultSize().cols);
}

function readUrlWordLength(params) {
  const explicitMode = Number(params.get("mode") || params.get("words") || params.get("wordLength"));
  const explicitSize = params.get("size");

  if (MODES[explicitMode]) {
    return explicitMode;
  }

  if (explicitSize === "5x5") {
    return 5;
  }

  return DEFAULT_WORD_LENGTH;
}

function applyUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const order = params.get("order");

  state.readingOrder = Object.values(READING_ORDER).includes(order)
    ? order
    : READING_ORDER.ROW;
  state.strictMode = parseUrlBoolean(params.get("strict"), false);
  state.timerMode = readUrlTimerMode(params);
}

function readUrlTimerMode(params) {
  if (params.has("timed")) {
    return parseUrlBoolean(params.get("timed"), true)
      ? TIMER_MODE.TIMED
      : TIMER_MODE.UNTIMED;
  }

  return parseUrlBoolean(params.get("untimed"), false)
    ? TIMER_MODE.UNTIMED
    : TIMER_MODE.TIMED;
}

function parseUrlBoolean(value, fallback) {
  if (value === null) {
    return fallback;
  }

  return ["1", "t", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseSizeKey(value, wordLength = state.wordLength) {
  if (!value) {
    return null;
  }

  const [rows, cols] = value.toLowerCase().split("x").map(Number);

  return isSupportedSize(rows, cols, wordLength) ? { rows, cols } : null;
}

function setWordLength(wordLength) {
  state.wordLength = MODES[wordLength] ? wordLength : DEFAULT_WORD_LENGTH;
  applyModeData();
}

function setBoardDimensions(rows, cols) {
  state.rows = rows;
  state.cols = cols;
}

function isSupportedSize(rows, cols, wordLength = state.wordLength) {
  return modeBoardSizes(wordLength).some((size) => size.rows === rows && size.cols === cols);
}

function modeBoardSizes(wordLength = state.wordLength) {
  const mode = MODES[wordLength] || MODES[DEFAULT_WORD_LENGTH];

  return mode.boardSizes.filter((size) => (
    ENABLE_6X6 || sizeKey(size.rows, size.cols) !== "6x6"
  ));
}

function defaultSize(wordLength = state.wordLength) {
  return modeBoardSizes(wordLength)[0];
}

function currentMode() {
  return MODES[state.wordLength] || MODES[DEFAULT_WORD_LENGTH];
}

function applyModeData() {
  const modeData = state.modeData[state.wordLength];

  state.allowedWords = modeData.allowedWords;
  state.anagrams = modeData.anagrams;
  state.preferredAnagrams = modeData.preferredAnagrams;
  state.generatorWords = modeData.generatorWords;
  updateModeText();
}

function updateModeText() {
  const mode = currentMode();
  const tileCountWords = {
    4: "four",
    5: "five"
  };

  elements.title.dataset.hint = `Tile the board with ${mode.wordLabel} ${mode.tilingKind} words.`;
  elements.ruleWordLength.textContent = mode.wordLabel;
  elements.ruleTileCount.textContent = tileCountWords[state.wordLength] || String(state.wordLength);
  renderExampleGrids();
}

function renderExampleGrids() {
  const examples = modeExamples();

  renderExampleGrid(elements.exampleValidStraight, examples.validStraight);
  renderExampleGrid(elements.exampleValidBent, examples.validBent);
  renderExampleGrid(elements.exampleInvalidDisconnected, examples.invalidDisconnected);
  renderExampleGrid(elements.exampleInvalidOrder, examples.invalidOrder);
}

function modeExamples() {
  if (state.wordLength === 5) {
    return {
      validStraight: exampleCells("WORDS", [
        [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]
      ]),
      validBent: exampleCells("WORDS", [
        [1, 1], [1, 2], [2, 2], [3, 2], [3, 3]
      ]),
      invalidDisconnected: exampleCells("WORDS", [
        [1, 1], [1, 3], [2, 2], [3, 3], [2, 5]
      ]),
      invalidOrder: exampleCells("WORDS", [
        [2, 1], [2, 2], [2, 3], [3, 2], [2, 4]
      ])
    };
  }

  return {
    validStraight: exampleCells("WORD", [
      [1, 1], [1, 2], [1, 3], [1, 4]
    ]),
    validBent: exampleCells("WORD", [
      [1, 1], [1, 2], [2, 2], [3, 2]
    ]),
    invalidDisconnected: exampleCells("WORD", [
      [1, 1], [1, 3], [2, 2], [3, 3]
    ]),
    invalidOrder: exampleCells("WORD", [
      [2, 1], [2, 2], [2, 3], [3, 2]
    ])
  };
}

function exampleCells(word, positions) {
  return [...word].map((letter, index) => ({
    letter,
    row: positions[index][0],
    col: positions[index][1]
  }));
}

function renderExampleGrid(element, cells) {
  element.innerHTML = "";
  element.style.setProperty("--example-cols", String(Math.max(...cells.map((cell) => cell.col))));

  cells.forEach((cell) => {
    const tile = document.createElement("b");

    tile.textContent = cell.letter;
    tile.style.gridArea = `${cell.row} / ${cell.col}`;
    element.append(tile);
  });
}

function currentSizeKey() {
  return sizeKey(state.rows, state.cols);
}

function canonicalSizeKey(rows, cols) {
  return rows <= cols ? sizeKey(rows, cols) : sizeKey(cols, rows);
}

function sizeKey(rows, cols) {
  return `${rows}x${cols}`;
}

function boardCellCount() {
  return state.rows * state.cols;
}

function pieceCount() {
  return boardCellCount() / state.wordLength;
}

function makeGridString() {
  return state.board.map((cell) => cell.letter).join("");
}

function makeGridUrl() {
  const url = new URL(window.location.href);
  const grid = makeGridString();

  url.searchParams.set("size", currentSizeKey());
  url.searchParams.set("mode", String(state.wordLength));
  url.searchParams.set("grid", grid);
  url.searchParams.set("order", state.readingOrder);
  url.searchParams.set("strict", state.strictMode ? "1" : "0");
  url.searchParams.set("timed", isTimedMode() ? "1" : "0");
  url.searchParams.delete("untimed");
  url.searchParams.delete("sol");

  const solution = validCurrentSolution();

  if (solution.length > 0) {
    url.searchParams.set("sol", encodeSolution(solution, grid));
  }

  url.hash = "";
  return url.toString();
}

function readUrlSolution(grid) {
  const params = new URLSearchParams(window.location.search);
  const solution = decodeSolution(params.get("sol"), grid);

  return Array.isArray(solution) ? solution : [];
}

function validCurrentSolution() {
  if (state.solution.length > 0 && isValidSolution(state.solution)) {
    return state.solution;
  }

  return findCurrentGridSolution();
}

function encodeSolution(solution, grid) {
  // This is only meant to keep the answer from being immediately readable in a URL.
  // It is obfuscation, not security.
  const pieceByCell = new Map();
  const values = [];

  solution.forEach((move, pieceIndex) => {
    move.cells.forEach((id) => pieceByCell.set(id, pieceIndex));
  });

  state.board.forEach((cell) => {
    const pieceIndex = pieceByCell.get(cell.id);

    if (pieceIndex === undefined) {
      return;
    }

    values.push(letterToInt(cell.letter));
    values.push(obfuscatedPieceValue(pieceIndex));
  });

  return values.length === boardCellCount() * 2
    ? cumulativeEncode(values)
    : "";
}

function decodeSolution(encoded, grid) {
  if (!encoded || !new RegExp(`^[a-z]{${boardCellCount() * 2}}$`, "i").test(encoded)) {
    return null;
  }

  const values = cumulativeDecode(encoded.toLowerCase());

  if (!values || values.length !== boardCellCount() * 2) {
    return null;
  }

  const pieces = Array.from({ length: pieceCount() }, () => []);

  for (let index = 0; index < boardCellCount(); index += 1) {
    const letterValue = values[index * 2];
    const pieceIndex = values[index * 2 + 1] % pieceCount();

    if (letterValue !== letterToInt(grid[index]) || values[index * 2 + 1] > 25) {
      return null;
    }

    pieces[pieceIndex].push(cellId(Math.floor(index / state.cols), index % state.cols));
  }

  const solution = pieces.map((cells) => makeSolutionMove(cells));

  if (solution.some((move) => move === null)) {
    return null;
  }

  return isValidSolution(solution) ? solution : null;
}

function makeSolutionMove(cells) {
  const cellObjects = cells.map(getCellById);
  const word = resolveSolutionWord(cellObjects);

  if (!word) {
    return null;
  }

  return {
    cells,
    word,
    shape: classifyPolyomino(cellObjects)
  };
}

function findCurrentGridSolution() {
  return currentTilings()
    .map((tiling) => compactTilingToPieces(tiling).map((cells) => makeSolutionMove(cells)))
    .find((solution) => (
      solution.every((move) => move !== null) &&
      isValidSolution(solution)
    )) || [];
}

function resolveSolutionWord(cells) {
  if (state.readingOrder === READING_ORDER.ANY) {
    const signature = anagramSignature(cells.map((cell) => cell.letter).join(""));
    return (
      state.preferredAnagrams.get(signature)?.[0] ||
      state.anagrams.get(signature)?.[0] ||
      null
    )?.toUpperCase() || null;
  }

  if (state.readingOrder === READING_ORDER.BOTH) {
    return preferredWord([
      readCells(cells, READING_ORDER.ROW),
      readCells(cells, READING_ORDER.COLUMN)
    ]);
  }

  const word = readCells(cells, state.readingOrder);
  return isAllowedWord(word) ? word : null;
}

function cumulativeEncode(values) {
  let sum = 0;

  return values.map((value) => {
    sum += value;
    return intToLetter((17 + sum) % 26);
  }).join("");
}

function cumulativeDecode(encoded) {
  let previous = 17;

  return [...encoded].map((letter) => {
    const current = letterToInt(letter);
    const value = (current - previous + 26) % 26;

    previous = current;
    return value;
  });
}

function letterToInt(letter) {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function intToLetter(value) {
  return String.fromCharCode(97 + value);
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function obfuscatedPieceValue(pieceIndex) {
  const count = pieceCount();
  const options = Math.floor((25 - pieceIndex) / count) + 1;

  return pieceIndex + count * randomInt(options);
}

function isValidSolution(solution) {
  const ids = new Set(state.board.map((cell) => cell.id));
  const usedIds = new Set(solution.flatMap((move) => move.cells));

  return (
    Array.isArray(solution) &&
    solution.length === pieceCount() &&
    usedIds.size === boardCellCount() &&
    solution.every((move) => (
      Array.isArray(move.cells) &&
      move.cells.length === state.wordLength &&
      move.cells.every((id) => ids.has(id)) &&
      isEdgeConnected(move.cells.map(getCellById)) &&
      resolveSolutionWord(move.cells.map(getCellById)) !== null &&
      typeof move.word === "string" &&
      new RegExp(`^[a-z]{${state.wordLength}}$`, "i").test(move.word) &&
      typeof move.shape === "string"
    ))
  );
}

function restoreStoredPuzzle() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));

    if (!isStoredPuzzle(stored)) {
      return false;
    }

    state.readingOrder = stored.readingOrder;
    state.strictMode = stored.strictMode;
    state.timerMode = stored.timerMode || (stored.untimedMode ? TIMER_MODE.UNTIMED : TIMER_MODE.TIMED);
    state.isIntro = false;
    setWordLength(stored.wordLength || DEFAULT_WORD_LENGTH);
    setBoardDimensions(stored.rows || defaultSize().rows, stored.cols || defaultSize().cols);
    state.board = makeBoardFromLetters(stored.letters);
    state.solution = stored.solution;
    state.startedAt = stored.startedAt || Date.now();
    syncSettingsControls();
    resetProgress({ resetTimer: false });
    saveCurrentPuzzle();
    return true;
  } catch {
    return false;
  }
}

function saveCurrentPuzzle() {
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        letters: makeGridString(),
        solution: state.solution,
        readingOrder: state.readingOrder,
        strictMode: state.strictMode,
        timerMode: state.timerMode,
        wordLength: state.wordLength,
        rows: state.rows,
        cols: state.cols,
        startedAt: state.startedAt
      })
    );
  } catch {
    // Storage can be unavailable in some browser privacy modes.
  }
}

function isStoredPuzzle(stored) {
  return (
    stored &&
    typeof stored.letters === "string" &&
    MODES[stored.wordLength || DEFAULT_WORD_LENGTH] &&
    isSupportedSize(
      stored.rows || defaultSize(stored.wordLength || DEFAULT_WORD_LENGTH).rows,
      stored.cols || defaultSize(stored.wordLength || DEFAULT_WORD_LENGTH).cols,
      stored.wordLength || DEFAULT_WORD_LENGTH
    ) &&
    stored.letters.length === (
      stored.rows || defaultSize(stored.wordLength || DEFAULT_WORD_LENGTH).rows
    ) * (
      stored.cols || defaultSize(stored.wordLength || DEFAULT_WORD_LENGTH).cols
    ) &&
    stored.letters.split("").every((letter) => /^[A-Z]$/.test(letter)) &&
    Object.values(READING_ORDER).includes(stored.readingOrder) &&
    typeof stored.strictMode === "boolean" &&
    (stored.timerMode === undefined || Object.values(TIMER_MODE).includes(stored.timerMode)) &&
    (stored.untimedMode === undefined || typeof stored.untimedMode === "boolean") &&
    Array.isArray(stored.solution) &&
    (stored.startedAt === undefined || Number.isFinite(stored.startedAt))
  );
}

function makeBoardFromLetters(letters) {
  return Array.from({ length: boardCellCount() }, (_, index) => ({
    id: cellId(Math.floor(index / state.cols), index % state.cols),
    row: Math.floor(index / state.cols),
    col: index % state.cols,
    letter: letters[index]
  }));
}

function resetProgress({ resetTimer = true } = {}) {
  state.selection = [];
  state.locked.clear();
  state.moves = [];
  state.activeMoveIndex = null;
  state.clickStartedOnSelectedTile = false;
  state.lastSelectionTap = null;
  state.lastLockedTap = null;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.cheatIndex = 0;
  state.solvedWithHelp = false;
  state.wordLengthCueCells = randomWordLengthCueCells();
  state.wordLengthCueColorIndex = randomInt(GROUP_COLOR_COUNT);
  state.isIntro = false;
  state.startedAt = resetTimer || state.startedAt === null ? Date.now() : state.startedAt;
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
  elements.board.style.gridTemplateColumns = `repeat(${state.cols}, minmax(0, 1fr))`;
  elements.board.style.aspectRatio = `${state.cols} / ${state.rows}`;
  elements.board.style.setProperty("--board-max-width", `${boardMaxWidth()}px`);
  elements.board.style.setProperty("--tile-font-size", `${tileFontSize()}rem`);
  elements.board.style.setProperty("--tile-radius", `${tileRadius()}px`);
  elements.board.style.setProperty("--tile-inset", `${tileInset()}px`);
  setSelectionLayoutSpace();

  state.board.forEach((cell) => {
    const button = document.createElement("button");
    const lockedMoveIndex = state.locked.get(cell.id);

    button.type = "button";
    button.className = getTileClassName(cell, lockedMoveIndex);
    button.textContent = cell.letter;
    button.dataset.id = cell.id;
    button.setAttribute("aria-label", getTileAriaLabel(cell, lockedMoveIndex));
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
  renderToolbar();
  renderModeSwitchButton();
}

function renderModeSwitchButton() {
  const nextWordLength = alternateWordLength();

  elements.modeSwitchButton.hidden = state.isIntro;
  elements.modeSwitchButton.textContent = String(state.wordLength);
  elements.modeSwitchButton.setAttribute(
    "aria-label",
    `Switch to ${nextWordLength}-letter mode`
  );
}

function renderToolbar() {
  elements.restartButton.hidden = state.isIntro;
  elements.fiveLetterButton.hidden = !state.isIntro;
  elements.newButton.setAttribute("aria-label", state.isIntro ? "Start four-letter game" : "New puzzle");
  elements.fiveLetterButton.setAttribute("aria-label", "Start five-letter game");
  elements.playArea.classList.toggle("is-intro", state.isIntro);
  elements.newButton.closest(".toolbar").classList.toggle("is-intro", state.isIntro);

  if (state.isIntro) {
    renderIntroModeButton(
      elements.newButton,
      [
        { letter: "O", row: 1, col: 1 },
        { letter: "P", row: 1, col: 2 },
        { letter: "E", row: 2, col: 2 },
        { letter: "N", row: 2, col: 3 }
      ],
      "intro-tiles-open",
      3
    );
    renderIntroModeButton(
      elements.fiveLetterButton,
      [
        { letter: "S", row: 1, col: 1 },
        { letter: "T", row: 1, col: 2 },
        { letter: "A", row: 1, col: 3 },
        { letter: "R", row: 2, col: 2 },
        { letter: "T", row: 2, col: 3 }
      ],
      "intro-tiles-start",
      3
    );
    return;
  }

  elements.newButton.textContent = "New";
}

function renderIntroModeButton(button, cells, className, cols) {
  button.textContent = "";

  const tileDisplay = document.createElement("span");
  tileDisplay.className = `intro-tiles ${className}`;
  tileDisplay.style.setProperty("--intro-cols", String(cols));
  tileDisplay.setAttribute("aria-hidden", "true");

  cells.forEach(({ letter, row, col }) => {
    const tile = document.createElement("span");
    tile.className = "intro-tile";
    tile.textContent = letter;
    tile.style.gridArea = `${row} / ${col}`;
    tileDisplay.append(tile);
  });

  button.append(tileDisplay);
}

function startDragSelection(cell, event) {
  if (event.detail === 1) {
    state.clickStartedOnSelectedTile = state.selection.includes(cell.id);
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (event.pointerType !== "mouse" && state.selection.includes(cell.id)) {
    handleSelectedTileTap(cell, event);
    return;
  }

  if (event.pointerType !== "mouse" && state.locked.has(cell.id)) {
    handleLockedTileTap(cell, event);
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

function handleSelectedTileTap(cell, event) {
  const now = Date.now();
  const isDoubleTap = (
    state.lastSelectionTap?.cellId === cell.id &&
    now - state.lastSelectionTap.time <= DOUBLE_TAP_MS
  );

  event.preventDefault();
  state.dragSelection = null;

  if (isDoubleTap) {
    state.lastSelectionTap = null;
    deselectSelectedCell(cell);
    return;
  }

  state.lastSelectionTap = {
    cellId: cell.id,
    time: now
  };
}

function handleLockedTileTap(cell, event) {
  const now = Date.now();
  const lockedMoveIndex = state.locked.get(cell.id);
  const isDoubleTap = (
    state.lastLockedTap?.cellId === cell.id &&
    now - state.lastLockedTap.time <= DOUBLE_TAP_MS
  );

  event.preventDefault();
  state.dragSelection = null;

  if (lockedMoveIndex === undefined) {
    return;
  }

  if (isDoubleTap || isDeleteAnchorCell(cell, lockedMoveIndex)) {
    state.lastLockedTap = null;
    deleteMove(lockedMoveIndex);
    return;
  }

  state.selection = [];
  state.activeMoveIndex = lockedMoveIndex;
  state.lastLockedTap = {
    cellId: cell.id,
    time: now
  };
  render();
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
    classes.push("is-locked", lockGroupClass(lockedMoveIndex));

    if (state.activeMoveIndex === lockedMoveIndex) {
      classes.push("is-active-group");
    }

    if (isDeleteAnchorCell(cell, lockedMoveIndex)) {
      classes.push("is-delete-anchor");
    }
  }

  return classes.join(" ");
}

function getTileAriaLabel(cell, lockedMoveIndex) {
  const position = `${cell.letter} at row ${cell.row + 1}, column ${cell.col + 1}`;

  if (lockedMoveIndex === undefined) {
    return position;
  }

  const move = state.moves[lockedMoveIndex];
  const word = move ? move.word.toUpperCase() : "completed word";

  if (isDeleteAnchorCell(cell, lockedMoveIndex)) {
    return `${position}. Remove ${word}.`;
  }

  return `${position}. Select completed word ${word}.`;
}

function boardMaxWidth() {
  const widthConstrained = boardMaxWidthForViewportWidth();
  const heightConstrained = boardMaxWidthForViewportHeight();

  return Math.min(widthConstrained, heightConstrained);
}

function boardMaxWidthForViewportWidth() {
  if (state.rows <= state.cols) {
    return 400;
  }

  if (window.matchMedia("(max-width: 430px)").matches) {
    return Math.round(360 * Math.sqrt(state.cols / state.rows));
  }

  return Math.round(400 * Math.sqrt(state.cols / state.rows));
}

function boardMaxWidthForViewportHeight() {
  const viewportHeight = window.innerHeight || 900;
  const verticalChrome = (
    appVerticalPadding() +
    44 +
    mastheadSpace() +
    reservedSelectionSpace() +
    12 +
    toolbarSpace()
  );
  const maxBoardHeight = Math.max(300, viewportHeight - verticalChrome);

  return Math.round(maxBoardHeight * state.cols / state.rows);
}

function appVerticalPadding() {
  return window.matchMedia("(max-width: 430px)").matches ? 20 : 48;
}

function mastheadSpace() {
  return window.matchMedia("(max-width: 430px)").matches ? 55 : 72;
}

function toolbarSpace() {
  if (state.isIntro) {
    return window.matchMedia("(max-width: 430px)").matches ? 60 : 64;
  }

  return window.matchMedia("(max-width: 430px)").matches ? 48 : 56;
}

function tileFontSize() {
  return Math.max(1.25, Math.min(3.1, 11 / state.cols));
}

function tileRadius() {
  return Math.max(12, Math.min(20, 82 / state.cols));
}

function tileInset() {
  return Math.max(4, Math.min(8, 34 / state.cols));
}

function setSelectionLayoutSpace() {
  const selectionSpace = reservedSelectionSpace();
  const completeRowSpace = completedSelectionRowSpace();

  elements.selectionLines.style.setProperty("--selection-space", `${selectionSpace}px`);
  elements.selectionLines.style.setProperty("--complete-row-space", `${completeRowSpace}px`);
  elements.completionMessage.style.setProperty(
    "--completion-message-space",
    `${completionMessageSpace(selectionSpace, completeRowSpace)}px`
  );
}

function completionMessageSpace(selectionSpace, completeRowSpace) {
  const fullSpace = selectionSpace - completeRowSpace;

  return state.isIntro ? Math.max(0, Math.round(fullSpace * 0.33)) : fullSpace;
}

function reservedSelectionSpace() {
  return Math.max(inProgressSelectionSpace(), completedSelectionSpace());
}

function inProgressSelectionSpace() {
  const count = pieceCount();

  if (count >= 6) {
    const rows = Math.ceil(count / 2);
    return rows * 28 + (rows - 1) * 5;
  }

  return count * 40 + (count - 1) * 3;
}

function completedSelectionSpace() {
  return completedSelectionRowSpace() + 132;
}

function completedSelectionRowSpace() {
  return pieceCount() >= 6 ? 68 : 42;
}

function selectCell(cell) {
  if (state.dragSelection?.moved) {
    state.dragSelection = null;
    return;
  }

  const lockedMoveIndex = state.locked.get(cell.id);

  if (lockedMoveIndex !== undefined) {
    handleLockedTileClick(cell, lockedMoveIndex);
    return;
  }

  addCellToSelection(cell);
}

function handleLockedTileClick(cell, lockedMoveIndex) {
  if (state.activeMoveIndex === lockedMoveIndex && isDeleteAnchorCell(cell, lockedMoveIndex)) {
    deleteMove(lockedMoveIndex);
    return;
  }

  state.selection = [];
  state.activeMoveIndex = lockedMoveIndex;
  state.lastLockedTap = null;
  render();
}

function addCellToSelection(cell) {
  if (state.invalidSelection) {
    return;
  }

  state.activeMoveIndex = null;

  if (state.selection.includes(cell.id) || state.selection.length >= state.wordLength) {
    return;
  }

  state.selection.push(cell.id);

  if (state.selection.length === state.wordLength) {
    state.dragSelection = null;
    finishSelection();
    return;
  }

  render();
}

function handleTileDoubleClick(cell) {
  const lockedMoveIndex = state.locked.get(cell.id);

  if (lockedMoveIndex !== undefined) {
    deleteMove(lockedMoveIndex);
    return;
  }

  deselectCellOnDoubleClick(cell);
}

function isDeleteAnchorCell(cell, moveIndex) {
  return state.activeMoveIndex === moveIndex && cell.id === deleteAnchorCellId(moveIndex);
}

function deleteAnchorCellId(moveIndex) {
  const move = state.moves[moveIndex];

  if (!move) {
    return null;
  }

  return move.cells
    .map(getCellById)
    .sort(compareCells)[0]?.id || null;
}

function deselectCellOnDoubleClick(cell) {
  if (!state.clickStartedOnSelectedTile) {
    return;
  }

  deselectSelectedCell(cell);
}

function deselectSelectedCell(cell) {
  const existingIndex = state.selection.indexOf(cell.id);

  if (existingIndex < 0) {
    return;
  }

  state.selection.splice(existingIndex, 1);
  state.clickStartedOnSelectedTile = false;
  state.lastSelectionTap = null;
  state.lastLockedTap = null;
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
  if (state.locked.size === boardCellCount()) {
    state.completedAt = Date.now();
  }
  render();
}

function validateSelection(selection) {
  if (selection.length !== state.wordLength) {
    return {
      valid: false,
      reason: `Choose exactly ${state.wordLength} tiles.`,
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
      reason: `Those ${state.wordLength} tiles are not edge-connected.`,
      shape: "Disconnected"
    };
  }

  return {
    valid: true,
    reason: `Valid ${currentMode().tilingKind}.`,
    shape: classifyPolyomino(cells)
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

function classifyPolyomino(cells) {
  if (cells.length !== 4) {
    return currentMode().tilingKind[0].toUpperCase() + currentMode().tilingKind.slice(1);
  }

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

function isCommonWord(word) {
  return state.generatorWords.includes(word.toLowerCase());
}

function preferredWord(words) {
  const allowed = words.filter(isAllowedWord);

  return allowed.find(isCommonWord) || allowed[0] || null;
}

function resolveSelectionWord(selection) {
  const cells = selection.map(getCellById);
  const selectedWord = cells.map((cell) => cell.letter).join("");

  if (state.strictMode) {
    return isAllowedWord(selectedWord) ? selectedWord : null;
  }

  if (state.readingOrder === READING_ORDER.ANY) {
    if (isAllowedWord(selectedWord)) {
      return selectedWord;
    }

    const signature = anagramSignature(cells.map((cell) => cell.letter).join(""));
    return (
      state.preferredAnagrams.get(signature)?.[0] ||
      state.anagrams.get(signature)?.[0] ||
      null
    )?.toUpperCase() || null;
  }

  if (state.readingOrder === READING_ORDER.BOTH) {
    if (isAllowedWord(selectedWord)) {
      return selectedWord;
    }

    return preferredWord([
      readCells(cells, READING_ORDER.ROW),
      readCells(cells, READING_ORDER.COLUMN)
    ]);
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
  elements.selectionLines.classList.toggle("is-complete-medium", isPuzzleComplete() && pieceCount() === 6);
  elements.selectionLines.classList.toggle("is-complete-large", isPuzzleComplete() && pieceCount() >= 9);
  elements.selectionLines.classList.toggle("is-in-progress-large", !isPuzzleComplete() && pieceCount() >= 6);

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
        row.append(makeMiniTile(letter, lockGroupClass(index)));
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

  if (shouldShowWordLengthCue()) {
    renderWordLengthCue(elements.selectionLines);
  }

  renderCompletionMessage();
}

function readCurrentSelectionDisplayWord() {
  return state.selection.length === state.wordLength
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

function randomWordLengthCueCells() {
  const shapes = wordLengthCueShapes(state.wordLength);

  return randomItem(shapes).map(({ row, col }) => ({ row, col }));
}

function wordLengthCueShapes(size) {
  if (!WORD_LENGTH_CUE_SHAPES.has(size)) {
    WORD_LENGTH_CUE_SHAPES.set(size, buildWordLengthCueShapes(size));
  }

  return WORD_LENGTH_CUE_SHAPES.get(size);
}

function buildWordLengthCueShapes(size) {
  let shapes = [normalizeCueCells([{ row: 0, col: 0 }])];

  for (let count = 1; count < size; count += 1) {
    const nextShapes = new Map();

    shapes.forEach((shape) => {
      shape.forEach((cell) => {
        cueNeighbors(cell).forEach((neighbor) => {
          const expanded = normalizeCueCells([...shape, neighbor]);

          if (expanded.length === count + 1) {
            nextShapes.set(cueShapeKey(expanded), expanded);
          }
        });
      });
    });

    shapes = [...nextShapes.values()];
  }

  return shapes.filter((shape) => shape.length === size && cueShapeHeight(shape) <= 3);
}

function cueNeighbors(cell) {
  return [
    { row: cell.row - 1, col: cell.col },
    { row: cell.row + 1, col: cell.col },
    { row: cell.row, col: cell.col - 1 },
    { row: cell.row, col: cell.col + 1 }
  ];
}

function normalizeCueCells(cells) {
  const uniqueCells = new Map();

  cells.forEach((cell) => {
    uniqueCells.set(`${cell.row},${cell.col}`, cell);
  });

  const minRow = Math.min(...[...uniqueCells.values()].map((cell) => cell.row));
  const minCol = Math.min(...[...uniqueCells.values()].map((cell) => cell.col));

  return [...uniqueCells.values()]
    .map((cell) => ({ row: cell.row - minRow, col: cell.col - minCol }))
    .sort(compareCells);
}

function cueShapeKey(cells) {
  return cells.map((cell) => `${cell.row},${cell.col}`).join(";");
}

function cueShapeHeight(cells) {
  return Math.max(...cells.map((cell) => cell.row)) + 1;
}

function getSelectionRowClassName(index) {
  const classes = ["selection-row", "is-complete", lockGroupClass(index)];

  if (state.activeMoveIndex === index) {
    classes.push("is-active");
  }

  return classes.join(" ");
}

function lockGroupClass(index) {
  return `lock-group-${index % GROUP_COLOR_COUNT}`;
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
  state.lastLockedTap = null;
  state.completedAt = null;
  state.solvedWithHelp = false;
  clearInvalidTimer();
  rebuildLockedMap();
  render();
}

function restartGame() {
  if (state.isIntro) {
    showIntroPuzzle();
    render();
    return;
  }

  resetProgress({ resetTimer: false });
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

function startNewGame() {
  if (state.isIntro) {
    startGameWithWordLength(DEFAULT_WORD_LENGTH);
    return;
  }

  generatePuzzle();
  updateAddressBar();
  render();
}

function startFiveLetterGame() {
  startGameWithWordLength(5);
}

function switchWordLengthMode() {
  startGameWithWordLength(alternateWordLength());
}

function alternateWordLength() {
  return state.wordLength === 5 ? DEFAULT_WORD_LENGTH : 5;
}

function startGameWithWordLength(wordLength) {
  setWordLength(wordLength);
  const size = defaultSize();

  setBoardDimensions(size.rows, size.cols);
  syncSettingsControls();
  generatePuzzle();
  updateAddressBar();
  render();
}

function updateReadingOrder(event) {
  setReadingOrder(event.target.value);
}

function updateBoardSize(event) {
  const size = parseSizeKey(event.target.value);

  if (size) {
    setBoardSize(size.rows, size.cols);
  }
}

function updateStrictMode(event) {
  setStrictMode(event.target.checked);
}

function updateTimerMode(event) {
  setTimerMode(event.target.checked ? TIMER_MODE.UNTIMED : TIMER_MODE.TIMED);
}

function setReadingOrder(readingOrder) {
  if (state.readingOrder === readingOrder) {
    return;
  }

  const shouldRefresh = hasChosenTiles();

  state.readingOrder = readingOrder;
  syncSettingsControls();
  closeSettingsPanel();

  if (shouldRefresh) {
    generatePuzzle();
  } else {
    saveCurrentPuzzle();
  }

  updateAddressBar();
  render();
}

function setBoardSize(rows, cols) {
  if (state.rows === rows && state.cols === cols) {
    return;
  }

  setBoardDimensions(rows, cols);
  syncSettingsControls();
  closeSettingsPanel();
  generatePuzzle();
  updateAddressBar();
  render();
}

function setStrictMode(enabled) {
  if (state.strictMode === enabled) {
    return;
  }

  state.strictMode = enabled;
  syncSettingsControls();
  closeSettingsPanel();

  if (enabled && hasChosenTiles()) {
    generatePuzzle();
    updateAddressBar();
    render();
    return;
  }

  saveCurrentPuzzle();
  updateAddressBar();
  render();
}

function setTimerMode(timerMode) {
  if (!Object.values(TIMER_MODE).includes(timerMode) || state.timerMode === timerMode) {
    return;
  }

  const shouldRefresh = timerMode === TIMER_MODE.TIMED || isPuzzleComplete();

  state.timerMode = timerMode;
  syncSettingsControls();
  closeSettingsPanel();

  if (shouldRefresh) {
    generatePuzzle();
    updateAddressBar();
    render();
    return;
  }

  saveCurrentPuzzle();
  updateAddressBar();
  render();
}

function isTimedMode() {
  return state.timerMode === TIMER_MODE.TIMED;
}

function hasChosenTiles() {
  return state.selection.length > 0 || state.moves.length > 0;
}

function updateSettingsSummary() {
  const labels = {
    [READING_ORDER.ROW]: "LR-TB",
    [READING_ORDER.COLUMN]: "TB-LR",
    [READING_ORDER.BOTH]: "Either",
    [READING_ORDER.ANY]: "Anagram"
  };

  elements.settingsSummary.textContent = [
    `${state.wordLength}L`,
    currentSizeKey(),
    labels[state.readingOrder],
    state.strictMode ? "Strict" : null,
    isTimedMode() ? null : "Untimed"
  ].filter(Boolean).join(" | ");
}

function syncSettingsControls() {
  configureBoardSizeControls();
  elements.boardSizeInputs.forEach((input) => {
    input.checked = input.value === currentSizeKey();
  });
  elements.readingOrderInputs.forEach((input) => {
    input.checked = input.value === state.readingOrder;
  });
  elements.strictModeInput.checked = state.strictMode;
  elements.timerModeInput.checked = !isTimedMode();
  updateSettingsSummary();
}

function toggleSettingsPanel(event) {
  event.stopPropagation();

  const isOpen = !elements.settingsPanel.hidden;

  elements.settingsPanel.hidden = isOpen;
  elements.settingsButton.setAttribute("aria-expanded", String(!isOpen));

  if (!isOpen) {
    closeInfoPanel();
    closeKeyboardPanel();
    closePrintPanel();
  }
}

function toggleInfoPanel(event) {
  event.stopPropagation();

  const isOpen = !elements.infoPanel.hidden;

  elements.infoPanel.hidden = isOpen;
  elements.infoButton.setAttribute("aria-expanded", String(!isOpen));

  if (!isOpen) {
    closeSettingsPanel();
    closeKeyboardPanel();
    closePrintPanel();
  }
}

function toggleKeyboardPanel() {
  const isOpen = !elements.keyboardPanel.hidden;

  elements.keyboardPanel.hidden = isOpen;

  if (!isOpen) {
    closeInfoPanel();
    closeSettingsPanel();
    closePrintPanel();
  }
}

function showPrintPanel() {
  closeInfoPanel();
  closeSettingsPanel();
  closeKeyboardPanel();
  elements.printGrid.value = makeGridUrl();
  elements.printPanel.hidden = false;
  elements.printGrid.focus();
  elements.printGrid.select();
}

async function copyPuzzleToClipboard() {
  const label = elements.shareButton.getAttribute("aria-label");

  closeInfoPanel();
  closeSettingsPanel();
  closeKeyboardPanel();
  closePrintPanel();

  try {
    await navigator.clipboard.writeText(makeGridUrl());
    elements.shareButton.setAttribute("aria-label", "Copied puzzle");
    elements.shareButton.classList.add("is-copied");
    window.setTimeout(() => {
      elements.shareButton.setAttribute("aria-label", label);
      elements.shareButton.classList.remove("is-copied");
    }, 900);
  } catch {
    showPrintPanel();
  }
}

function updateAddressBar() {
  window.history.replaceState(null, "", makeGridUrl());
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

  if (!elements.keyboardPanel.hidden && !elements.keyboardPanel.contains(event.target)) {
    closeKeyboardPanel();
  }

  if (!elements.printPanel.hidden && !elements.printPanel.contains(event.target)) {
    closePrintPanel();
  }

  if (
    state.activeMoveIndex !== null &&
    !event.target.closest(".tile") &&
    !event.target.closest(".selection-row")
  ) {
    state.activeMoveIndex = null;
    state.lastLockedTap = null;
    render();
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

function closeKeyboardPanel() {
  elements.keyboardPanel.hidden = true;
}

function closePrintPanel() {
  elements.printPanel.hidden = true;
}

function handleKeydown(event) {
  if (
    event.key === "Escape" &&
    (
      !elements.infoPanel.hidden ||
      !elements.settingsPanel.hidden ||
      !elements.keyboardPanel.hidden ||
      !elements.printPanel.hidden
    )
  ) {
    closeInfoPanel();
    closeSettingsPanel();
    closeKeyboardPanel();
    closePrintPanel();
    return;
  }

  if (handleCheatCode(event)) {
    return;
  }

  if (handleShortcut(event)) {
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

function handleShortcut(event) {
  if (event.metaKey || event.ctrlKey || event.altKey || isFormField(event.target)) {
    return false;
  }

  const key = event.key.toLowerCase();
  const shortcuts = {
    "?": () => toggleKeyboardPanel(),
    i: () => toggleInfoPanel(event),
    s: () => setStrictMode(true),
    o: () => setStrictMode(false),
    n: () => startNewGame(),
    p: () => showPrintPanel(),
    r: () => restartGame(),
    l: () => setReadingOrder(READING_ORDER.ROW),
    t: () => setReadingOrder(READING_ORDER.COLUMN),
    e: () => setReadingOrder(READING_ORDER.BOTH),
    a: () => setReadingOrder(READING_ORDER.ANY)
  };

  if (!shortcuts[key]) {
    return false;
  }

  event.preventDefault();
  shortcuts[key]();
  return true;
}

function handleCheatCode(event) {
  if (event.metaKey || event.ctrlKey || event.altKey || isFormField(event.target)) {
    return false;
  }

  const key = event.key.toLowerCase();

  if (key === CHEAT_CODE[state.cheatIndex]) {
    event.preventDefault();
    state.cheatIndex += 1;

    if (state.cheatIndex === CHEAT_CODE.length) {
      state.cheatIndex = 0;
      solveWithHelp();
      return true;
    }

    return false;
  }

  state.cheatIndex = key === CHEAT_CODE[0] ? 1 : 0;
  return false;
}

function isFormField(element) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element?.tagName);
}

function rebuildLockedMap() {
  state.locked.clear();

  state.moves.forEach((move, moveIndex) => {
    move.cells.forEach((id) => state.locked.set(id, moveIndex));
  });
}

function solveWithHelp() {
  state.solution = validCurrentSolution();

  if (state.solution.length === 0 || !isValidSolution(state.solution)) {
    return;
  }

  state.selection = [];
  state.activeMoveIndex = null;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.completedAt = Date.now();
  state.solvedWithHelp = true;
  clearInvalidTimer();
  state.moves = state.solution.map((move) => ({
    cells: [...move.cells],
    word: move.word,
    shape: move.shape
  }));
  rebuildLockedMap();
  render();
}

function renderCompletionMessage() {
  elements.completionMessage.innerHTML = "";
  elements.completionMessage.classList.toggle("is-complete", isPuzzleComplete());

  if (!isPuzzleComplete() || !isTimedMode() || state.isIntro) {
    return;
  }

  const label = document.createElement("span");
  const time = document.createElement("strong");

  label.className = "completion-label";
  label.textContent = "Time";
  time.className = state.solvedWithHelp ? "is-assisted" : "";
  time.textContent = formatElapsedTime(state.completedAt - state.startedAt);

  elements.completionMessage.append(label, time);
}

function shouldShowWordLengthCue() {
  return (
    !state.isIntro &&
    !isPuzzleComplete() &&
    state.moves.length === 0 &&
    state.selection.length === 0 &&
    state.wordLengthCueCells.length > 0
  );
}

function renderWordLengthCue(parent) {
  const cue = document.createElement("div");
  const cols = Math.max(...state.wordLengthCueCells.map((cell) => cell.col)) + 1;
  const letters = wordLengthCueWord().toUpperCase();

  cue.className = "word-length-cue";
  cue.style.setProperty("--cue-cols", String(cols));
  cue.style.setProperty("--cue-bg", `var(--locked-${String.fromCharCode(97 + state.wordLengthCueColorIndex)})`);
  cue.setAttribute("aria-label", `${wordLengthCueWord()} mode: ${state.wordLength}-letter words`);

  state.wordLengthCueCells.forEach((cell, index) => {
    const tile = document.createElement("span");

    tile.className = "word-length-cue-tile";
    tile.textContent = letters[index];
    tile.style.gridArea = `${cell.row + 1} / ${cell.col + 1}`;
    tile.setAttribute("aria-hidden", "true");
    cue.append(tile);
  });

  parent.append(cue);
}

function wordLengthCueWord() {
  return state.wordLength === 5 ? "Model" : "Mode";
}

function isPuzzleComplete() {
  return state.locked.size === boardCellCount() && state.completedAt !== null;
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
  if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) {
    return null;
  }

  return state.board[row * state.cols + col];
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
