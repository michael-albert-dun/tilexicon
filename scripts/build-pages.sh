#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INCLUDE_6X6=false
OUTPUT_DIR="$ROOT_DIR/docs"

for arg in "$@"; do
  case "$arg" in
    --include-6x6)
      INCLUDE_6X6=true
      ;;
    *)
      OUTPUT_DIR="$arg"
      ;;
  esac
done

if [[ "$OUTPUT_DIR" == "$ROOT_DIR" || "$OUTPUT_DIR" == "/" ]]; then
  echo "Refusing to overwrite unsafe output directory: $OUTPUT_DIR" >&2
  exit 1
fi

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/src" "$OUTPUT_DIR/data"

cp "$ROOT_DIR/index.html" "$OUTPUT_DIR/"
cp "$ROOT_DIR/styles.css" "$OUTPUT_DIR/"
cp "$ROOT_DIR/LICENSE" "$OUTPUT_DIR/"
cp "$ROOT_DIR/README.md" "$OUTPUT_DIR/"

cp "$ROOT_DIR/src/game.js" "$OUTPUT_DIR/src/"
cat > "$OUTPUT_DIR/src/config.js" <<'CONFIG'
window.TilexiconConfig = {
  enable6x6: false
};
CONFIG

cp "$ROOT_DIR/data/allowed-words.txt" "$OUTPUT_DIR/data/"
cp "$ROOT_DIR/data/common-words.txt" "$OUTPUT_DIR/data/"
cp "$ROOT_DIR/data/tetromino-tilings-4x4.txt" "$OUTPUT_DIR/data/"
cp "$ROOT_DIR/data/tetromino-tilings-4x5.txt" "$OUTPUT_DIR/data/"
cp "$ROOT_DIR/data/tetromino-tilings-4x6.txt" "$OUTPUT_DIR/data/"

if [[ "$INCLUDE_6X6" == true ]]; then
  cp "$ROOT_DIR/data/tetromino-tilings-6x6.txt" "$OUTPUT_DIR/data/"
fi

echo "Built GitHub Pages static site in $OUTPUT_DIR"
if [[ "$INCLUDE_6X6" == true ]]; then
  echo "6x6 is disabled by default, but ?enable6x6=1 can opt in."
else
  echo "6x6 is disabled; data/tetromino-tilings-6x6.txt was not copied."
fi
