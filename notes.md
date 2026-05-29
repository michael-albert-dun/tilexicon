# Tilexicon Notes

## Tetromino Tiling References

The 4x4 board is small enough that Tilexicon can keep a generated list of all
starter tilings, but these references are useful background for later rulesets
and larger boards.

- Exact cover is the natural formulation for tiling a board with polyominoes:
  https://en.wikipedia.org/wiki/Exact_cover
- Knuth's Algorithm X is the classic backtracking algorithm for exact cover
  problems, with Dancing Links as the efficient implementation technique:
  https://en.wikipedia.org/wiki/Knuth%27s_Algorithm_X
- MathWorld's polyomino page gives terminology and references for free, fixed,
  and one-sided polyominoes:
  https://mathworld.wolfram.com/Polyomino.html
- Cut-the-Knot has a short tetromino tiling page with 4x4 square examples:
  https://cut-the-knot.org/blue/TetrominoFaultFree.shtml
- Redelmeier's 1981 paper is a classic reference for enumerating fixed
  polyominoes:
  https://barequet.cs.technion.ac.il/poly-papers/math-cs/1981-Redelmeier.pdf

## Current Tiling Files

The compact files `data/tetromino-tilings-*.txt` contain generated tetromino
tilings for the standard stored board sizes:

- `4x4`
- `4x5`
- `4x6`
- `6x6`

Rectangular boards are stored with `rows <= cols`; the app transposes `4x5`
tilings for `5x4`, and `4x6` tilings for `6x4`.

The generated files assume:

- Rectangular boards.
- All five free tetromino families are allowed: `I`, `O`, `T`, `L`, and `S`.
- Rotations and reflections are allowed.
- Repeated shapes are allowed.
- Tilings are stored without regard to move order.

Each line is a row-major tiling string. The characters `0` to `k - 1` identify
the tetromino covering each cell, with labels assigned in first-uncovered-cell
order.

Regenerate the files with:

```sh
scripts/generate-tetromino-tilings.py
```
