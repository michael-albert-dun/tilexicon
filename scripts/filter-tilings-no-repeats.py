#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
from collections import defaultdict
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
TILING_NAME_RE = re.compile(r"^(?P<family>.+)-tilings-(?P<rows>\d+)x(?P<cols>\d+)\.txt$")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Filter compact tiling files to keep only tilings with no repeated "
            "normalized piece orientation."
        )
    )
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="Tiling files to filter. Defaults to all data/*-tilings-*x*.txt files.",
    )
    args = parser.parse_args()

    paths = args.paths or sorted(DATA_DIR.glob("*-tilings-*x*.txt"))

    for path in paths:
        if path.name.endswith("-no-repeats.txt"):
            continue

        filter_file(path)


def filter_file(path: Path) -> None:
    match = TILING_NAME_RE.match(path.name)

    if not match:
        raise ValueError(f"Cannot infer board size from {path}")

    rows = int(match.group("rows"))
    cols = int(match.group("cols"))
    output_path = path.with_name(f"{path.stem}-no-repeats.txt")
    kept = 0
    total = 0

    print(f"Filtering {path.relative_to(ROOT_DIR)} -> {output_path.relative_to(ROOT_DIR)}")

    with path.open("r", encoding="utf-8") as source, output_path.open("w", encoding="utf-8") as output:
        for line in source:
            tiling = line.strip()

            if not tiling:
                continue

            total += 1

            if has_no_repeated_orientations(tiling, rows, cols):
                output.write(f"{tiling}\n")
                kept += 1

    print(f"Kept {kept} of {total} tilings")


def has_no_repeated_orientations(tiling: str, rows: int, cols: int) -> bool:
    if len(tiling) != rows * cols:
        raise ValueError(f"Tiling length {len(tiling)} does not match {rows}x{cols}")

    pieces = defaultdict(list)

    for index, label in enumerate(tiling):
        pieces[label].append((index // cols, index % cols))

    signatures = [orientation_signature(cells) for cells in pieces.values()]

    return len(signatures) == len(set(signatures))


def orientation_signature(cells: list[tuple[int, int]]) -> tuple[tuple[int, int], ...]:
    min_row = min(row for row, _ in cells)
    min_col = min(col for _, col in cells)

    return tuple(sorted((row - min_row, col - min_col) for row, col in cells))


if __name__ == "__main__":
    main()
