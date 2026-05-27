# Wordomino Notes

## Tetromino Tiling References

The 4x4 board is small enough that Wordomino can keep a generated list of all
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

## Current 4x4 Tiling Assumptions

The generated file `data/tetromino-tilings-4x4.json` currently assumes:

- A 4x4 rectangular board.
- All five free tetromino families are allowed: `I`, `O`, `T`, `L`, and `S`.
- Rotations and reflections are allowed.
- Repeated shapes are allowed.
- Tilings are stored without regard to move order.

Regenerate the list with:

```sh
scripts/generate-4x4-tilings.js
```
