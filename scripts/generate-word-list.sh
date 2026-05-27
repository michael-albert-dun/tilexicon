#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PROPER_NAMES="/usr/share/dict/propernames"
SYSTEM_WORDS="/usr/share/dict/words"
EXCLUDED_WORDS="$ROOT_DIR/data/excluded-words.txt"
EXTRA_WORDS="$ROOT_DIR/data/extra-words.txt"
ALLOWED_WORDS="$ROOT_DIR/data/allowed-words.txt"

awk '
  FILENAME == proper_names {
    if (length($0) == 4 && $0 ~ /^[A-Z][a-z]+$/) {
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
    if (length(word) == 4 && $0 ~ /^[a-z]+$/ && !(word in proper) && !(word in blocked)) {
      print word
    }
  }

  FILENAME == extra_words {
    word = tolower($0)
    if (length(word) == 4 && word ~ /^[a-z]+$/ && !(word in blocked)) {
      print word
    }
    next
  }
' proper_names="$PROPER_NAMES" excluded_words="$EXCLUDED_WORDS" \
  extra_words="$EXTRA_WORDS" \
  "$PROPER_NAMES" "$EXCLUDED_WORDS" "$SYSTEM_WORDS" "$EXTRA_WORDS" \
  | sort -u > "$ALLOWED_WORDS"
