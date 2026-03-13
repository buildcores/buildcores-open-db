#!/bin/bash
#
# validate-random.sh - Validate a random sample of JSON files per category
#
# Usage:
#   ./scripts/validate-random.sh            # Validate 10 random files per category
#   ./scripts/validate-random.sh 5          # Validate 5 random files per category
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATE_SCRIPT="$SCRIPT_DIR/validate.sh"
SAMPLE_SIZE="${1:-10}"

if ! [[ "$SAMPLE_SIZE" =~ ^[0-9]+$ ]] || [ "$SAMPLE_SIZE" -le 0 ]; then
    echo "Error: sample size must be a positive integer."
    echo "Usage: $0 [sample-size]"
    exit 1
fi

if [ ! -x "$VALIDATE_SCRIPT" ]; then
    echo "Error: validate.sh not found or not executable at $VALIDATE_SCRIPT"
    exit 1
fi

cd "$REPO_ROOT"

OVERALL_EXIT=0
TOTAL_CATEGORIES=0
TOTAL_FILES=0

for category_dir in open-db/*; do
    [ -d "$category_dir" ] || continue
    TOTAL_CATEGORIES=$((TOTAL_CATEGORIES + 1))

    category_name=$(basename "$category_dir")

    selected_files=()
    while IFS= read -r file; do
        [ -n "$file" ] && selected_files+=("$file")
    done < <(
        python3 - "$category_dir" "$SAMPLE_SIZE" <<'PY'
import glob
import random
import sys

category = sys.argv[1]
sample_size = int(sys.argv[2])
files = sorted(glob.glob(f"{category}/*.json"))
if not files:
    raise SystemExit(0)

k = min(sample_size, len(files))
for path in random.sample(files, k):
    print(path)
PY
    )

    file_count=${#selected_files[@]}
    TOTAL_FILES=$((TOTAL_FILES + file_count))

    if [ "$file_count" -eq 0 ]; then
        echo ""
        echo "[$category_name] No JSON files found, skipping."
        continue
    fi

    echo ""
    echo "[$category_name] Validating $file_count random file(s)..."

    set +e
    "$VALIDATE_SCRIPT" "${selected_files[@]}"
    category_exit=$?
    set -e

    if [ "$category_exit" -ne 0 ]; then
        OVERALL_EXIT=1
    fi
done

echo ""
echo "========================================"
echo "Random Validation Complete"
echo "  Categories checked: $TOTAL_CATEGORIES"
echo "  Files validated:    $TOTAL_FILES"
echo "========================================"

exit "$OVERALL_EXIT"
