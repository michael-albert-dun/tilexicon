# Tilexicon

Tilexicon is a browser-based word puzzle played on a rectangular grid of
letter tiles. The player covers the board with four-letter tetromino words or
five-letter pentomino words, chosen from the opening screen.

The game is implemented with plain HTML, CSS, and JavaScript. It runs locally
without a build step.

## Gameplay

- Select four or five tiles to make a word, depending on the mode.
- The selected tiles must be connected along their edges.
- Valid selections lock into the board.
- Complete the puzzle by covering every tile.
- Invalid selections briefly shake and clear.
- Restart clears the current selections while keeping the same board.
- The opening screen is a completed example puzzle; choose a word length to start.
- New generates a fresh puzzle.

Words are read left-to-right, top-to-bottom by default. The reading order can
be changed from the settings menu.

## Settings

- Four-letter mode supports the tetromino board sizes from 4 x 4 to 6 x 6.
- Five-letter mode supports 4 x 5, 5 x 4, and 5 x 5 pentomino boards.
- Reading modes are left-to-right, top-to-bottom; top-to-bottom, left-to-right;
  either of those orders; or any anagram.
- Strict mode requires tiles to be chosen in the exact accepted order, while
  untimed mode hides the completion timer.

## Controls

Tiles can be selected by clicking/tapping or by dragging across the board.

- Backspace removes the last tile from an in-progress selection.
- Backspace on an active completed word removes that word.
- Tapping a completed word makes it active and shows an `x`; tapping the `x`
  removes the full word.

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

- `size=4x4|4x5|5x4|5x5|4x6|6x4|6x6`
- `mode=4|5`
- `grid=<letters>`
- `order=row|column|both|any`
- `strict=1`
- `timed=0|1`
- `sol=<encoded-solution>`

A grid-only link defaults to four-letter mode, 4 x 4, left-to-right reading,
ordinary mode, and timed play.

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

The default Pages build disables 6 x 6 and omits
`data/tetromino-tilings-6x6.txt`. To deploy a static build where 6 x 6 is
hidden by default but available by URL opt-in, run:

```sh
scripts/build-pages.sh --include-6x6
```

Then visit with `?enable6x6=1` to reveal and load 6 x 6. On GitHub, set Pages
to deploy from the `main` branch and the `/docs` folder.

## Data Files

The four-letter allowed-word list lives in `data/allowed-words.txt`; the
five-letter list lives in `data/allowed-words-5.txt`. Random puzzle generation
uses the smaller curated `common-words` lists.

Regenerate the word lists with:

```sh
scripts/generate-word-list.sh
```

Compact tiling files live in `data/tetromino-tilings-*.txt` and
`data/pentomino-tilings-*.txt`. Each line is a row-major tiling string. The
characters `0` to `k - 1` identify the polyomino covering each cell, with
labels assigned in first-uncovered-cell order. Rectangular tiling files are
stored with `rows <= cols`; portrait boards use transposed copies in memory.

Regenerate the tiling files with:

```sh
scripts/generate-tetromino-tilings.py
```

See `notes.md` for tetromino tiling references and background.
