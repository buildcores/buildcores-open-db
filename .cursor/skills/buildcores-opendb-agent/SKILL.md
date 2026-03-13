---
name: buildcores-opendb-agent
description: Verifies and enriches BuildCores OpenDB part JSON files, including schema-safe edits, variant hygiene, duplicate checks, and required post-edit validation. Use when editing files under open-db/, updating specs/SKUs/manufacturer URLs, adding new parts, or maintaining data quality.
---

# BuildCores OpenDB Agent

## When to Use

Use this skill when working on BuildCores OpenDB data tasks:

- Updating existing component JSON files in `open-db/`
- Adding new parts or variants
- Filling missing specs, SKUs, or `manufacturer_url`
- Cleaning schema violations and data consistency issues

## Core Rules

1. Do not guess specs. Use authoritative sources or leave fields blank/null.
2. Treat `opendb_id` as canonical. Filename (without `.json`) must match it.
3. Do not add fields not defined in the category schema.
4. Check for duplicates before adding a new part.
5. After every JSON edit, run validation and require pass.

## Required Workflow

1. Identify category and open the relevant schema:
   - `schemas/{Category}.schema.json`
2. Make targeted edits only for fields supported by schema.
3. Run validation on edited files:
   - `./scripts/validate.sh <path-to-file.json>`
4. If validation fails, fix errors immediately and re-run.
5. Do not mark work complete until validation passes.

## Duplicate and Variant Hygiene

Before creating a part:

- Search by name keywords
- Search by manufacturer part number(s)
- Search by retailer SKU(s)
- Verify variant-level differences (OC/non-OC, color, capacity, revision)

Do not create duplicates. Similar siblings can still be valid distinct variants.

## Verification Priority

1. Manufacturer source (primary authority)
2. Retailer listings (secondary confirmation)
3. Cross-source agreement for disputed/missing values

## Data Quality Targets

- Accurate, schema-compliant specs
- Correct variant grouping (`metadata.manufacturer`, `metadata.series`, `metadata.variant`)
- Valid `general_product_information` values
- Clean formatting and no unknown keys

## Repo Instructions Source

Follow the complete repository guidance in `agents.md` at repo root for:

- End-to-end quality checklists
- Variant grouping standards
- Source verification process
- Save vs verify expectations
