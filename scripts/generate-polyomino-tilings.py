#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
LABELS = "0123456789abcdefghijklmnopqrstuvwxyz"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate compact free-polyomino tiling files."
    )
    parser.add_argument(
        "order",
        type=int,
        help="Polyomino order, e.g. 5 for pentominoes.",
    )
    parser.add_argument(
        "sizes",
        nargs="+",
        help="Board sizes as ROWSxCOLS, e.g. 4x5 5x5.",
    )
    args = parser.parse_args()

    if args.order < 1:
        raise ValueError("Polyomino order must be positive")

    sizes = [parse_size(size) for size in args.sizes]
    DATA_DIR.mkdir(exist_ok=True)

    for rows, cols in sizes:
        write_tilings(args.order, rows, cols)


def parse_size(size: str) -> tuple[int, int]:
    try:
        rows, cols = size.lower().split("x", 1)
        parsed_rows = int(rows)
        parsed_cols = int(cols)
        return (parsed_rows, parsed_cols) if parsed_rows <= parsed_cols else (parsed_cols, parsed_rows)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Invalid size: {size}") from exc


def write_tilings(order: int, rows: int, cols: int) -> None:
    if rows * cols % order != 0:
        raise ValueError(f"{rows}x{cols} cannot be tiled by order-{order} polyominoes")

    piece_count = rows * cols // order

    if piece_count > len(LABELS):
        raise ValueError("Not enough labels for this board")

    family_name = family_name_for(order)
    output_path = DATA_DIR / f"{family_name}-tilings-{rows}x{cols}.txt"
    shapes = generate_free_polyominoes(order)
    count = 0

    print(
        f"Generating {rows}x{cols} with {len(shapes)} order-{order} shapes "
        f"-> {output_path.relative_to(ROOT_DIR)}"
    )

    with output_path.open("w", encoding="utf-8") as output:
        for tiling in generate_tilings(order, rows, cols, shapes):
            output.write(f"{tiling}\n")
            count += 1

    print(f"Wrote {count} tilings")


def family_name_for(order: int) -> str:
    names = {
        1: "monomino",
        2: "domino",
        3: "triomino",
        4: "tetromino",
        5: "pentomino",
        6: "hexomino",
    }

    return names.get(order, f"polyomino-{order}")


def generate_tilings(order: int, rows: int, cols: int, shapes: set[tuple[tuple[int, int], ...]]):
    placements_by_cell = build_placements_by_cell(rows, cols, shapes)
    piece_count = rows * cols // order
    board = [-1] * (rows * cols)

    def search(next_label: int):
        first_empty = find_first_empty(board)

        if first_empty is None:
            yield "".join(LABELS[value] for value in board)
            return

        if next_label >= piece_count:
            return

        for placement in placements_by_cell[first_empty]:
            if any(board[cell] != -1 for cell in placement):
                continue

            for cell in placement:
                board[cell] = next_label

            yield from search(next_label + 1)

            for cell in placement:
                board[cell] = -1

    yield from search(0)


def build_placements_by_cell(
    rows: int,
    cols: int,
    shapes: set[tuple[tuple[int, int], ...]],
) -> list[list[tuple[int, ...]]]:
    placements_by_cell: list[list[tuple[int, ...]]] = [[] for _ in range(rows * cols)]
    placements = set()

    for shape in sorted(shapes):
        for orientation in sorted(transforms_of(shape)):
            height = max(row for row, _ in orientation) + 1
            width = max(col for _, col in orientation) + 1

            for row in range(rows - height + 1):
                for col in range(cols - width + 1):
                    placement = tuple(
                        sorted((cell_row + row) * cols + cell_col + col for cell_row, cell_col in orientation)
                    )
                    placements.add(placement)

    for placement in placements:
        for cell in placement:
            placements_by_cell[cell].append(placement)

    for cell_placements in placements_by_cell:
        cell_placements.sort()

    return placements_by_cell


def generate_free_polyominoes(order: int) -> set[tuple[tuple[int, int], ...]]:
    shapes = {((0, 0),)}

    for _ in range(1, order):
        next_shapes = set()

        for shape in shapes:
            cells = set(shape)
            for row, col in shape:
                for neighbor in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                    if neighbor in cells:
                        continue

                    next_shapes.add(canonical(tuple(cells | {neighbor})))

        shapes = next_shapes

    return shapes


def canonical(cells: tuple[tuple[int, int], ...]) -> tuple[tuple[int, int], ...]:
    return min(transforms_of(cells))


def transforms_of(cells: tuple[tuple[int, int], ...]) -> list[tuple[tuple[int, int], ...]]:
    transforms = (
        lambda row, col: (row, col),
        lambda row, col: (row, -col),
        lambda row, col: (-row, col),
        lambda row, col: (-row, -col),
        lambda row, col: (col, row),
        lambda row, col: (col, -row),
        lambda row, col: (-col, row),
        lambda row, col: (-col, -row),
    )
    seen = {}

    for transform in transforms:
        transformed = normalize(tuple(transform(row, col) for row, col in cells))
        seen[transformed] = transformed

    return list(seen.values())


def normalize(cells: tuple[tuple[int, int], ...]) -> tuple[tuple[int, int], ...]:
    min_row = min(row for row, _ in cells)
    min_col = min(col for _, col in cells)

    return tuple(sorted((row - min_row, col - min_col) for row, col in cells))


def find_first_empty(board: list[int]) -> int | None:
    for cell, value in enumerate(board):
        if value == -1:
            return cell

    return None


if __name__ == "__main__":
    main()
