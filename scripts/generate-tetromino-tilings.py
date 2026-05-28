#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"

BASE_SHAPES = {
    "I": ((0, 0), (0, 1), (0, 2), (0, 3)),
    "O": ((0, 0), (0, 1), (1, 0), (1, 1)),
    "T": ((0, 0), (0, 1), (0, 2), (1, 1)),
    "L": ((0, 0), (1, 0), (2, 0), (2, 1)),
    "S": ((0, 1), (0, 2), (1, 0), (1, 1)),
}

DEFAULT_SIZES = ((4, 4), (4, 5), (5, 4), (4, 6), (6, 4), (6, 6))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate compact tetromino tiling files."
    )
    parser.add_argument(
        "sizes",
        nargs="*",
        help="Board sizes as ROWSxCOLS, e.g. 4x4 4x5 6x6. Defaults to common sizes.",
    )
    args = parser.parse_args()

    sizes = [parse_size(size) for size in args.sizes] if args.sizes else DEFAULT_SIZES
    DATA_DIR.mkdir(exist_ok=True)

    for rows, cols in sizes:
        write_tilings(rows, cols)


def parse_size(size: str) -> tuple[int, int]:
    try:
        rows, cols = size.lower().split("x", 1)
        return int(rows), int(cols)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Invalid size: {size}") from exc


def write_tilings(rows: int, cols: int) -> None:
    if rows * cols % 4 != 0:
        raise ValueError(f"{rows}x{cols} cannot be tiled by tetrominoes")

    output_path = DATA_DIR / f"tetromino-tilings-{rows}x{cols}.txt"
    count = 0

    print(f"Generating {rows}x{cols} -> {output_path.relative_to(ROOT_DIR)}")

    with output_path.open("w", encoding="utf-8") as output:
        for tiling in generate_tilings(rows, cols):
            output.write(f"{tiling}\n")
            count += 1

    print(f"Wrote {count} tilings")


def generate_tilings(rows: int, cols: int):
    placements_by_cell = build_placements_by_cell(rows, cols)
    cell_count = rows * cols
    piece_count = cell_count // 4
    labels = "0123456789abcdefghijklmnopqrstuvwxyz"

    if piece_count > len(labels):
        raise ValueError("Not enough labels for this board")

    board = [-1] * cell_count

    def search(next_label: int):
        first_empty = find_first_empty(board)

        if first_empty is None:
            yield "".join(labels[value] for value in board)
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


def build_placements_by_cell(rows: int, cols: int) -> list[list[tuple[int, ...]]]:
    placements_by_cell: list[list[tuple[int, ...]]] = [[] for _ in range(rows * cols)]
    placements = set()

    for shape in BASE_SHAPES.values():
        for orientation in transforms_of(shape):
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
