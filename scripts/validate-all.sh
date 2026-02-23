#!/bin/bash
#
# validate-all.sh - Validate all OpenDB JSON component files
#
# Usage:
#   ./scripts/validate-all.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -x "$SCRIPT_DIR/validate.sh" ]; then
    echo "Error: validate.sh not found or not executable at $SCRIPT_DIR/validate.sh"
    exit 1
fi

cd "$REPO_ROOT"

# Validate all tracked and untracked JSON files in open-db.
all_files=()

while IFS= read -r file; do
    [ -z "$file" ] && continue
    all_files+=("$file")
done < <(git ls-files -- 'open-db/**/*.json' 'open-db/*.json')

while IFS= read -r file; do
    [ -z "$file" ] && continue
    all_files+=("$file")
done < <(git ls-files --others --exclude-standard -- 'open-db/**/*.json' 'open-db/*.json')

if [ "${#all_files[@]}" -eq 0 ]; then
    echo "No JSON files found in open-db/."
    exit 0
fi

echo "Found ${#all_files[@]} JSON files to validate."

# Run validation in batches to avoid OS argument length limits.
BATCH_SIZE=250
TOTAL_FILES=${#all_files[@]}
START_INDEX=0
BATCH_NUMBER=0
OVERALL_EXIT=0

while [ "$START_INDEX" -lt "$TOTAL_FILES" ]; do
    END_INDEX=$((START_INDEX + BATCH_SIZE))
    if (( END_INDEX > TOTAL_FILES )); then
        END_INDEX=$TOTAL_FILES
    fi

    BATCH_NUMBER=$((BATCH_NUMBER + 1))
    echo "Batch $BATCH_NUMBER: validating files $((START_INDEX + 1))-$END_INDEX of $TOTAL_FILES..."

    BATCH_FILES=("${all_files[@]:START_INDEX:END_INDEX-START_INDEX}")

    set +e
    "$SCRIPT_DIR/validate.sh" "${BATCH_FILES[@]}"
    BATCH_EXIT=$?
    set -e

    if [ "$BATCH_EXIT" -ne 0 ]; then
        OVERALL_EXIT=1
    fi

    START_INDEX="$END_INDEX"
done

exit "$OVERALL_EXIT"
