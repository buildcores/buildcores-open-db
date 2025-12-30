# Product Variants in OpenDB

This document explains how product variants are represented in the OpenDB database and how to properly add new variants of existing products.

## What Are Variants?

Variants are different versions of the same base product. For example:

- **GPU**: ASUS ROG STRIX RTX 4090 comes in "OC Edition", "Gaming", and base model variants
- **RAM**: Corsair Vengeance RGB DDR5 comes in different speed/capacity combinations like "6400 CL32" or "5600 CL36"
- **Cases**: NZXT H7 comes in "Black", "White", "Flow Black", "Flow White" variants

Variants share the same manufacturer and product series but differ in specific attributes like clock speeds, colors, or feature sets.

## How Variants Are Represented

Variants are grouped together using the `metadata` object in each part's JSON file. The key fields are:

| Field | Purpose | Example |
|-------|---------|---------|
| `metadata.manufacturer` | The company that makes the product | `"ASUS"`, `"Corsair"`, `"NZXT"` |
| `metadata.series` | The product line/series name | `"ROG STRIX RTX 4090"`, `"Vengeance RGB"` |
| `metadata.variant` | What distinguishes this specific variant | `"OC Edition"`, `"6400 CL32"`, `"White Mesh"` |

**Parts are grouped as variants when they share the same `manufacturer` AND `series`.**

## Example: GPU Variants

Here are three variants of the same GPU:

### Variant 1: OC Edition
```json
{
  "opendb_id": "abc-123",
  "metadata": {
    "name": "ASUS ROG STRIX GeForce RTX 4090 OC Edition",
    "manufacturer": "ASUS",
    "series": "ROG STRIX RTX 4090",
    "variant": "OC Edition"
  },
  "core_boost_clock": 2610,
  "color": ["BLACK"]
}
```

### Variant 2: Gaming
```json
{
  "opendb_id": "def-456",
  "metadata": {
    "name": "ASUS ROG STRIX GeForce RTX 4090 Gaming",
    "manufacturer": "ASUS",
    "series": "ROG STRIX RTX 4090",
    "variant": "Gaming"
  },
  "core_boost_clock": 2550,
  "color": ["BLACK"]
}
```

### Variant 3: White Edition
```json
{
  "opendb_id": "ghi-789",
  "metadata": {
    "name": "ASUS ROG STRIX GeForce RTX 4090 OC White",
    "manufacturer": "ASUS",
    "series": "ROG STRIX RTX 4090",
    "variant": "OC White"
  },
  "core_boost_clock": 2610,
  "color": ["WHITE"]
}
```

All three share `manufacturer: "ASUS"` and `series: "ROG STRIX RTX 4090"`, so they are grouped together as variants on BuildCores.

## Category-Specific Guidelines

### GPUs

- **Series**: Usually the chipset + manufacturer line (e.g., `"ROG STRIX RTX 4090"`, `"TUF Gaming RTX 4080"`)
- **Variant**: Factory OC tier, cooling edition, or color (e.g., `"OC Edition"`, `"Gaming"`, `"White"`)

### RAM

- **Series**: Product line name (e.g., `"Vengeance RGB"`, `"Trident Z5 RGB"`, `"T-Create"`)
- **Variant**: Speed + CAS latency combination (e.g., `"6400 CL32"`, `"5600 CL36"`)

### Cases

- **Series**: Product line (e.g., `"H7"`, `"4000D"`, `"O11 Dynamic"`)
- **Variant**: Color and panel type (e.g., `"Black"`, `"White Mesh"`, `"Black Airflow"`)

### CPU Coolers

- **Series**: Product line (e.g., `"NH-D15"`, `"Kraken X63"`)
- **Variant**: Color or revision (e.g., `"chromax.black"`, `"White"`, `"V2"`)

### Motherboards

- **Series**: Product line (e.g., `"ROG STRIX Z790-E"`, `"MAG B650 TOMAHAWK"`)
- **Variant**: WiFi or other feature variants (e.g., `"WIFI"`, `"WIFI II"`)

### Storage (SSDs/HDDs)

- **Series**: Product line (e.g., `"980 PRO"`, `"SN850X"`)
- **Variant**: Capacity (e.g., `"1TB"`, `"2TB"`, `"4TB"`)

## Best Practices

### Before Adding a New Part

1. **Search for existing variants** in the same category folder
2. **Check the exact spelling** of `manufacturer` and `series` in existing files
3. **Copy the metadata format** from a sibling variant if one exists

### Matching Existing Variant Groups

When adding a variant of an existing product:

1. Find an existing variant in `/open-db/{Category}/`
2. Copy the exact `manufacturer` and `series` values
3. Only change the `variant` field and variant-specific attributes

**Spelling and case must match exactly:**
- CORRECT:  `"ASUS"` matches `"ASUS"`
- WRONG:  `"Asus"` does NOT match `"ASUS"`
- WRONG: `"ASUS "` (trailing space) does NOT match `"ASUS"`

### Creating a New Product Series

If no variants exist yet:

1. Choose a clear, consistent `manufacturer` name (check existing products from the same company)
2. Choose a `series` name that represents the product line, not the full product name
3. Use `variant` for the specific edition/configuration

### What Goes Where?

| Information | Field |
|-------------|-------|
| Company name | `metadata.manufacturer` |
| Product line/family | `metadata.series` |
| Specific edition/config | `metadata.variant` |
| Full product name | `metadata.name` |

**Example breakdown:**
- Full name: `"Corsair Vengeance RGB DDR5-6400 CL32 32GB (2x16GB)"`
- Manufacturer: `"Corsair"`
- Series: `"Vengeance RGB"`
- Variant: `"6400 CL32"`

## Common mistake

### Wrong: Putting variant info in series
```json
{
  "metadata": {
    "manufacturer": "ASUS",
    "series": "ROG STRIX RTX 4090 OC Edition",  //  wrong
    "variant": null
  }
}
```

### Right: Separating series and variant
```json
{
  "metadata": {
    "manufacturer": "ASUS",
    "series": "ROG STRIX RTX 4090",  //  correct
    "variant": "OC Edition"          //   correct
  }
}
```

### Wrong: Inconsistent manufacturer spelling
```json
// File 1
{ "metadata": { "manufacturer": "ASUS" } }

// File 2  
{ "metadata": { "manufacturer": "Asus" } }  // wrong: won't group together
```

