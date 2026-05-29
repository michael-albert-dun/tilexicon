# Tilexicon

Tilexicon is a browser-based word puzzle played on a rectangular grid of
letter tiles. The player covers the board with four-letter words, each made
from four edge-connected tiles in a tetromino shape.

The game is implemented with plain HTML, CSS, and JavaScript. It runs locally
without a build step.

## Gameplay

- Select four tiles to make a word.
- The four tiles must be connected along their edges.
- Valid selections lock into the board.
- Complete the puzzle by covering every tile.
- Invalid four-tile selections briefly shake and clear.
- Restart clears the current selections while keeping the same board.
- New generates a fresh puzzle.

Words are read left-to-right, top-to-bottom by default. The reading order can
be changed from the settings menu.

## Settings

- Tilexicon supports all board sizes from 4 x 4 to 6 x 6 that can be tiled with
  tetrominoes.
- Reading modes are left-to-right, top-to-bottom; top-to-bottom, left-to-right;
  either of those orders; or any anagram.
- Strict mode requires tiles to be chosen in the exact accepted order, while
  untimed mode hides the completion timer.

## Controls

Tiles can be selected by clicking/tapping or by dragging across the board.

- Backspace removes the last tile from an in-progress selection.
- Backspace on an active completed word removes that word.
- Double-clicking any tile in a completed word removes the full word.

Keyboard shortcuts:

- `?`: keyboard shortcuts
- `I`: info
- `R`: restart
- `N`: new puzzle
- `P`: print/copy puzzle string
- `S`: strict mode
- `O`: ordinary mode
- `L`: left-to-right reading mode
- `T`: top-to-bottom reading mode
- `E`: either reading mode
- `A`: anagram mode

## Sharing

Puzzle links can encode the board, settings, and an obfuscated solution.

Supported URL parameters:

- `size=4x4|4x5|5x4|4x6|6x4|6x6`
- `grid=<letters>`
- `order=row|column|both|any`
- `strict=1`
- `timed=0|1`
- `sol=<encoded-solution>`

A grid-only link defaults to 4 x 4, left-to-right reading, ordinary mode, and
timed play.

The solution encoding is not intended to be secure; it is only meant to avoid
making the answer immediately readable in the URL.

## Running Locally

Start a local server from the project directory:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Configuration

Static builds can disable the 6 x 6 board by editing `src/config.js`:

```js
window.TilexiconConfig = {
  enable6x6: false
};
```

## GitHub Pages Build

Build a GitHub Pages copy in `docs/` with:

```sh
scripts/build-pages.sh
```

The Pages build disables 6 x 6 and omits `data/tetromino-tilings-6x6.txt`.
On GitHub, set Pages to deploy from the `main` branch and the `/docs` folder.

## Data Files

The allowed-word list lives in `data/allowed-words.txt`. Random puzzle
generation uses the smaller curated `data/common-words.txt` list.

Regenerate the word lists with:

```sh
scripts/generate-word-list.sh
```

Compact tetromino tiling files live in `data/tetromino-tilings-*.txt`. Each
line is a row-major tiling string. The characters `0` to `k - 1` identify the
tetromino covering each cell, with labels assigned in first-uncovered-cell
order. Rectangular tiling files are stored with `rows <= cols`; portrait boards
use transposed copies in memory.

Regenerate the tiling files with:

```sh
scripts/generate-tetromino-tilings.py
```

See `notes.md` for tetromino tiling references and background.
