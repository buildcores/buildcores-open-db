#!/bin/bash
#
# validate.sh - Validate JSON files against OpenDB schemas
#
# Usage:
#   ./scripts/validate.sh <file1.json> [file2.json ...]  # Validate specific files
#   ./scripts/validate.sh                                 # Validate all git-changed files
#
# Requirements:
#   - jq (for JSON parsing)
#   - ajv-cli (for JSON schema validation): npm install -g ajv-cli@5.0.0
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory (to find schemas relative to repo root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check dependencies
check_dependencies() {
    local missing=0
    
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is not installed.${NC}"
        echo "Install with: brew install jq (macOS) or apt install jq (Linux)"
        missing=1
    fi
    
    if ! command -v ajv &> /dev/null; then
        echo -e "${RED}Error: ajv-cli is not installed.${NC}"
        echo "Install with: npm install -g ajv-cli@5.0.0"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# Check for additional properties not in schema (recursive)
# Returns 0 if no additional properties found, 1 if found
check_additional_properties() {
    local file="$1"
    local schema_file="$2"
    local path="${3:-}"
    
    local extra_fields=""
    
    # Get allowed properties from schema at this level
    local schema_props
    if [ -z "$path" ]; then
        schema_props=$(jq -r '.properties // {} | keys[]' "$schema_file" 2>/dev/null | sort)
    else
        schema_props=$(jq -r "${path}.properties // {} | keys[]" "$schema_file" 2>/dev/null | sort)
    fi
    
    # Get actual properties from file at this level
    local file_props
    if [ -z "$path" ]; then
        file_props=$(jq -r 'keys[]' "$file" 2>/dev/null | sort)
    else
        # Convert schema path to file path (remove .properties)
        local file_path=$(echo "$path" | sed 's/\.properties//g')
        file_props=$(jq -r "${file_path} // {} | keys[]" "$file" 2>/dev/null | sort)
    fi
    
    # Find properties in file but not in schema
    for prop in $file_props; do
        if ! echo "$schema_props" | grep -q "^${prop}$"; then
            if [ -z "$path" ]; then
                extra_fields="$extra_fields $prop"
            else
                local display_path=$(echo "$path" | sed 's/\.properties//g' | sed 's/^\.//')
                extra_fields="$extra_fields ${display_path}.${prop}"
            fi
        fi
    done
    
    if [ -n "$extra_fields" ]; then
        echo "$extra_fields"
        return 1
    fi
    
    # Recursively check nested objects
    for prop in $schema_props; do
        local prop_type
        if [ -z "$path" ]; then
            prop_type=$(jq -r ".properties.${prop}.type // \"\"" "$schema_file" 2>/dev/null)
        else
            prop_type=$(jq -r "${path}.properties.${prop}.type // \"\"" "$schema_file" 2>/dev/null)
        fi
        
        # Check if it's an object type (could be array like ["object", "null"])
        if echo "$prop_type" | grep -q "object"; then
            local new_path
            if [ -z "$path" ]; then
                new_path=".properties.${prop}"
            else
                new_path="${path}.properties.${prop}"
            fi
            
            local nested_extra
            nested_extra=$(check_additional_properties "$file" "$schema_file" "$new_path" 2>/dev/null) || true
            if [ -n "$nested_extra" ]; then
                extra_fields="$extra_fields $nested_extra"
            fi
        fi
    done
    
    if [ -n "$extra_fields" ]; then
        echo "$extra_fields"
        return 1
    fi
    
    return 0
}

# Get files to validate
get_files_to_validate() {
    if [ $# -gt 0 ]; then
        # Files provided as arguments
        echo "$@"
    else
        # Get git-changed files (staged and unstaged)
        cd "$REPO_ROOT"
        git diff --name-only HEAD 2>/dev/null | grep '\.json$' | grep -v '\.schema\.json$' || true
        git diff --name-only --cached 2>/dev/null | grep '\.json$' | grep -v '\.schema\.json$' || true
    fi
}

# Validate a single file
validate_file() {
    local file="$1"
    local errors=0
    
    # Convert to absolute path if relative
    if [[ "$file" != /* ]]; then
        file="$REPO_ROOT/$file"
    fi
    
    # Check file exists
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ File not found: $file${NC}"
        return 1
    fi
    
    # Get relative path for display
    local rel_path="${file#$REPO_ROOT/}"
    
    # Extract filename and opendb_id
    local filename=$(basename "$file" .json)
    local opendb_id=$(jq -r '.opendb_id // empty' "$file" 2>/dev/null)
    
    # Check 1: Filename matches opendb_id
    if [ -z "$opendb_id" ]; then
        echo -e "${YELLOW}⚠ $rel_path: Missing opendb_id field${NC}"
        errors=1
    elif [ "$filename" != "$opendb_id" ]; then
        echo -e "${RED}✗ $rel_path: Filename ($filename) does not match opendb_id ($opendb_id)${NC}"
        return 1
    fi
    
    # Determine category from path
    local category=$(echo "$rel_path" | cut -d'/' -f2)
    local schema_file="$REPO_ROOT/schemas/${category}.schema.json"
    
    # Check 2: Schema validation
    if [ ! -f "$schema_file" ]; then
        echo -e "${YELLOW}⚠ $rel_path: No schema found for category '$category'${NC}"
        return $errors
    fi
    
    local validation_output
    if ! validation_output=$(ajv validate -s "$schema_file" -d "$file" --all-errors 2>&1); then
        echo -e "${RED}✗ $rel_path: Schema validation failed${NC}"
        echo "  $validation_output" | head -5
        return 1
    fi
    
    # Check 3: Additional properties not in schema
    local extra_props
    extra_props=$(check_additional_properties "$file" "$schema_file" 2>/dev/null) || true
    if [ -n "$extra_props" ]; then
        echo -e "${RED}✗ $rel_path: Additional properties not in schema:${NC}"
        for prop in $extra_props; do
            echo "    - $prop"
        done
        return 1
    fi
    
    echo -e "${GREEN}✓ $rel_path${NC}"
    return 0
}

# Main
main() {
    check_dependencies
    
    local files
    files=$(get_files_to_validate "$@")
    
    if [ -z "$files" ]; then
        echo "No JSON files to validate."
        echo ""
        echo "Usage:"
        echo "  $0 <file1.json> [file2.json ...]  # Validate specific files"
        echo "  $0                                 # Validate all git-changed files"
        exit 0
    fi
    
    local passed=0
    local failed=0
    local total=0
    
    echo "Validating JSON files..."
    echo ""
    
    for file in $files; do
        [ -z "$file" ] && continue
        total=$((total + 1))
        
        if validate_file "$file"; then
            passed=$((passed + 1))
        else
            failed=$((failed + 1))
        fi
    done
    
    echo ""
    echo "========================================"
    echo "Validation Summary:"
    echo -e "  ${GREEN}✓ Passed: $passed${NC}"
    if [ $failed -gt 0 ]; then
        echo -e "  ${RED}✗ Failed: $failed${NC}"
    fi
    echo "  Total:  $total"
    echo "========================================"
    
    if [ $failed -gt 0 ]; then
        exit 1
    fi
    
    exit 0
}

main "$@"
