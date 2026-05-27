#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const BOARD_SIZE = 4;
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "tetromino-tilings-4x4.json");

const BASE_SHAPES = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]]
};

const placements = buildPlacements();
const tilings = findTilings();

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(tilings, null, 2)}\n`);

console.log(`Wrote ${tilings.length} tilings to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);

function buildPlacements() {
  const seen = new Map();

  Object.entries(BASE_SHAPES).forEach(([shape, cells]) => {
    transformsOf(cells).forEach((orientation) => {
      const height = 1 + Math.max(...orientation.map(([row]) => row));
      const width = 1 + Math.max(...orientation.map(([, col]) => col));

      for (let row = 0; row <= BOARD_SIZE - height; row += 1) {
        for (let col = 0; col <= BOARD_SIZE - width; col += 1) {
          const boardCells = orientation
            .map(([cellRow, cellCol]) => cellId(cellRow + row, cellCol + col))
            .sort((a, b) => a - b);
          const key = `${shape}:${boardCells.join(",")}`;

          seen.set(key, {
            shape,
            cells: boardCells.map((id) => ({
              row: Math.floor(id / BOARD_SIZE),
              col: id % BOARD_SIZE
            }))
          });
        }
      }
    });
  });

  return [...seen.values()];
}

function findTilings() {
  const placementsByCell = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => []);
  const tilingsBySignature = new Map();

  placements.forEach((placement, placementIndex) => {
    placement.cells.forEach(({ row, col }) => {
      placementsByCell[cellId(row, col)].push(placementIndex);
    });
  });

  search([], []);

  return [...tilingsBySignature.values()];

  function search(coveredCells, chosenPlacements) {
    if (chosenPlacements.length === BOARD_SIZE) {
      if (coveredCells.length === BOARD_SIZE * BOARD_SIZE) {
        addTiling(chosenPlacements);
      }
      return;
    }

    const covered = new Set(coveredCells);
    let nextCell = null;
    let candidates = null;

    for (let cell = 0; cell < BOARD_SIZE * BOARD_SIZE; cell += 1) {
      if (covered.has(cell)) {
        continue;
      }

      const options = placementsByCell[cell].filter((placementIndex) =>
        placementIds(placements[placementIndex]).every((id) => !covered.has(id))
      );

      if (candidates === null || options.length < candidates.length) {
        nextCell = cell;
        candidates = options;
      }
    }

    if (nextCell === null) {
      return;
    }

    candidates.forEach((placementIndex) => {
      search(
        [...coveredCells, ...placementIds(placements[placementIndex])],
        [...chosenPlacements, placementIndex]
      );
    });
  }

  function addTiling(chosenPlacements) {
    const pieces = chosenPlacements
      .map((placementIndex) => placements[placementIndex])
      .sort(comparePlacements);
    const signature = pieces.map(placementSignature).join("|");

    tilingsBySignature.set(signature, pieces);
  }
}

function transformsOf(cells) {
  const transforms = [
    ([row, col]) => [row, col],
    ([row, col]) => [row, -col],
    ([row, col]) => [-row, col],
    ([row, col]) => [-row, -col],
    ([row, col]) => [col, row],
    ([row, col]) => [col, -row],
    ([row, col]) => [-col, row],
    ([row, col]) => [-col, -row]
  ];
  const seen = new Map();

  transforms.forEach((transform) => {
    const normalized = normalize(cells.map(transform));
    seen.set(coordinateSignature(normalized), normalized);
  });

  return [...seen.values()];
}

function normalize(cells) {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));

  return cells
    .map(([row, col]) => [row - minRow, col - minCol])
    .sort(compareCoordinates);
}

function placementIds(placement) {
  return placement.cells.map(({ row, col }) => cellId(row, col));
}

function placementSignature(placement) {
  return `${placement.shape}:${placementIds(placement).sort((a, b) => a - b).join(",")}`;
}

function coordinateSignature(cells) {
  return cells.map(([row, col]) => `${row},${col}`).join(";");
}

function compareCoordinates(a, b) {
  return a[0] - b[0] || a[1] - b[1];
}

function comparePlacements(a, b) {
  return placementSignature(a).localeCompare(placementSignature(b));
}

function cellId(row, col) {
  return row * BOARD_SIZE + col;
}
