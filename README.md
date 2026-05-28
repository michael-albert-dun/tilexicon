# Wordomino

Wordomino is an experimental word puzzle game played on a rectangular grid of
letter tiles. Players select four connected tiles in the shape of a tetromino.
If the selected tiles, read in row order from left to right, form a valid
four-letter word, the selection is locked into the board.

This is intended as a small local JavaScript playground rather than a polished
product at first. The core idea is simple, but the rules are deliberately open
for variation.

## Core Idea

- The board is a rectangular grid of lettered tiles.
- A move selects exactly four tiles.
- The selected tiles must form one valid tetromino shape.
- The letters are read in row-major order: top row to bottom row, and within
  each row from left to right, unless the reading-order setting changes that.
- The resulting four-letter string must appear in the active word list.
- Accepted words lock their tiles.
- The main puzzle goal is to tile the whole board with valid words.
- Moves can be undone.

For example, a selected shape covering these four positions:

```text
C A
  R
  E
```

would be read as `CARE`, because the letters are ordered first by row, then by
column.

## Tetrominoes

The starting rules should treat the usual free tetromino families as valid
selection shapes:

- `I`
- `O`
- `T`
- `S` / `Z`
- `J` / `L`

Implementation detail: shape validation should probably avoid hard-coding only
the display names above. A better early approach is to normalize any selected
four-cell shape into coordinates, verify that the cells are edge-connected, and
optionally classify the resulting tetromino afterward.

## First Playable Version

A minimal first version should support:

1. Rendering a rectangular board of letter tiles.
2. Clicking or tapping tiles to build a four-tile selection.
3. Validating whether the selected tiles form a tetromino.
4. Reading the selection in row-major order.
5. Locking valid tetromino selections into the board.
6. Undoing locked selections.
7. Checking the resulting string against a four-letter dictionary.

The first implementation can run locally in the browser with plain HTML, CSS,
and JavaScript. No build step should be required until the project earns one.

Early development used this starter board:

```text
C B O A
A R A T
G E B L
E A R E
```

One useful sanity-check tiling for that board is:

- `CARE`
- `BOAT`
- `ABLE`
- `GEAR`

The browser prototype now generates a fresh 4x4 puzzle by choosing a random
tetromino tiling and filling each tetromino with a random allowed word.

## Possible Rule Variations

Wordomino is meant to be a rules playground. Some variations worth exploring:

- Whether used tiles are locked, removed, replaced, or left alone.
- Whether gravity applies after a valid word.
- Whether new letters enter from the top, bottom, random empty cells, or not at
  all.
- Whether duplicate words are allowed.
- Whether duplicate board positions are allowed across moves.
- Whether the player is racing a timer, solving a fixed board, or maximizing a
  score over a fixed number of moves.
- Whether rare letters, awkward shapes, or longer chains earn bonuses.
- Whether the dictionary is strict, friendly, thematic, or configurable.
- Whether selections must be edge-connected only, or whether diagonal contact is
  ever allowed in special modes.
- Whether the board starts random, seeded, hand-authored, or generated to ensure
  a minimum number of possible moves.

## Architecture Notes

Keep the game logic independent from the DOM where practical. That will make it
easier to test rule variations without rewriting the interface.

Likely modules:

- `board`: grid creation, tile lookup, bounds checks, board mutation.
- `selection`: selected cell state, ordering, normalization, shape validation.
- `dictionary`: word-list loading and membership checks.
- `rulesets`: move validation, scoring, tile replacement, end conditions.
- `ui`: rendering, input handling, feedback, and local controls.

The rule layer should be data-driven where possible. A ruleset might eventually
describe things like:

```js
{
  wordLength: 4,
  requireTetromino: true,
  readOrder: "row-major",
  consumeTiles: false,
  allowRepeatedWords: false,
  refillMode: "none"
}
```

That shape is only a sketch, but the general goal is useful: avoid baking one
version of the game into every function.

## Local Development

Use a tiny local server from the project directory so the browser can load the
word list:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Open Questions

- What board size feels best?
- Should all tetromino orientations be equally useful, or should shape choice
  matter strategically?
- Should invalid selections be blocked immediately or allowed and then judged?
- Should the game feel like a relaxed word toy, a tight puzzle, or an arcade
  score chase?
- What kind of word list gives the best balance between surprise and fairness?

## Status

Prototype started. The browser version currently supports random 4x4 boards
generated from known tetromino tilings and common four-letter words, four-tile
selections, tetromino-shape validation, broader dictionary validation, tile
locking, configurable reading order, strict selection mode, untimed mode, click or drag
selection, a discreet rules popover, restart, new puzzle, and deleting a previous
selection by clicking its
mini-tile row and pressing Backspace. Restart removes all selections from the
current board; New generates a new board. Backspace also removes the last tile
from the current in-progress selection.
Double-clicking a displayed mini-tile row deletes that full word; double-clicking
a completed group tile in the main grid unlocks that group and leaves the other
three tiles as the active selection. Invalid four-tile selections briefly shake
and then clear. The completion timer stays hidden during play and appears as a
large elapsed-time display only after the board is fully tiled.

When the reading order is `Either order`, generated hidden words randomly use
one of the two directional readings per tetromino. When the reading order is
`Any anagram`, generated hidden words are shuffled across their tetromino tiles.

The allowed-word list lives in `data/allowed-words.txt`, generated from the
local system dictionary by keeping lowercase four-letter words, excluding proper
names, and applying the project deny list in `data/excluded-words.txt`.
Common words that collide with proper names or are otherwise omitted can be
forced back in via `data/extra-words.txt`.
Random boards use the smaller curated `data/common-words.txt` list so generated
puzzles are less obscure.

Regenerate it with:

```sh
scripts/generate-word-list.sh
```

The file `data/tetromino-tilings-4x4.json` contains all currently generated
4x4 tetromino tilings under the starter assumptions: all five free tetromino
families, rotations/reflections allowed, repeated shapes allowed. Regenerate it
with:

```sh
scripts/generate-4x4-tilings.js
```

See `notes.md` for tetromino tiling references and background.
