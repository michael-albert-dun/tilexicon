#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PROPER_NAMES="/usr/share/dict/propernames"
SYSTEM_WORDS="/usr/share/dict/words"
EXCLUDED_WORDS="$ROOT_DIR/data/excluded-words.txt"
EXTRA_WORDS="$ROOT_DIR/data/extra-words.txt"
WORD_LENGTH=4
ALLOWED_WORDS=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --length)
      WORD_LENGTH="$2"
      shift 2
      ;;
    --output)
      ALLOWED_WORDS="$2"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--length N] [--output PATH]" >&2
      exit 1
      ;;
  esac
done

if [ -z "$ALLOWED_WORDS" ]; then
  if [ "$WORD_LENGTH" -eq 4 ]; then
    ALLOWED_WORDS="$ROOT_DIR/data/allowed-words.txt"
  else
    ALLOWED_WORDS="$ROOT_DIR/data/allowed-words-$WORD_LENGTH.txt"
  fi
fi

EXTRA_WORDS_FOR_LENGTH="$ROOT_DIR/data/extra-words-$WORD_LENGTH.txt"

if [ ! -f "$EXTRA_WORDS_FOR_LENGTH" ]; then
  EXTRA_WORDS_FOR_LENGTH=/dev/null
fi

awk '
  FILENAME == proper_names {
    if (length($0) == word_length && $0 ~ /^[A-Z][a-z]+$/) {
      proper[tolower($0)] = 1
    }
    next
  }

  FILENAME == excluded_words {
    if ($0 !~ /^#/ && $0 != "") {
      blocked[$0] = 1
    }
    next
  }

  {
    word = tolower($0)
    if (length(word) == word_length && $0 ~ /^[a-z]+$/ && !(word in proper) && !(word in blocked)) {
      print word
    }
  }

  FILENAME == extra_words || FILENAME == extra_words_for_length {
    word = tolower($0)
    if (length(word) == word_length && word ~ /^[a-z]+$/ && !(word in blocked)) {
      print word
    }
    next
  }
' word_length="$WORD_LENGTH" proper_names="$PROPER_NAMES" excluded_words="$EXCLUDED_WORDS" \
  extra_words="$EXTRA_WORDS" extra_words_for_length="$EXTRA_WORDS_FOR_LENGTH" \
  "$PROPER_NAMES" "$EXCLUDED_WORDS" "$SYSTEM_WORDS" "$EXTRA_WORDS" "$EXTRA_WORDS_FOR_LENGTH" \
  | sort -u > "$ALLOWED_WORDS"
