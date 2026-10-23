# OpenDB Data Model Notes

OpenDB component files combine public product specifications with the identifiers BuildCores uses to match the same product across sources. The category schemas in [`/schemas`](../schemas/) are the validation contract for these files.

## Record and product identifiers

`opendb_id` is the stable UUID for an OpenDB record. It must match the component file name without the `.json` extension.

When a component has a canonical identity snapshot, it is stored in the top-level `identifiers` object:

```json
{
  "opendb_id": "123e4567-e89b-42d3-a456-426614174000",
  "identifiers": {
    "version": 3,
    "identifiers": [
      {
        "type": "mpn",
        "value": "EXAMPLE-MODEL-123",
        "region": "all"
      }
    ],
    "retailer_listings": [
      {
        "source": "example-retailer",
        "channel": "us",
        "source_product_id": "example-listing-123",
        "pricing_enabled": true,
        "verified": false
      }
    ]
  }
}
```

- `version` is the current identity snapshot version. When editing an existing record, keep this value unchanged; BuildCores uses it to detect conflicting edits and creates the next version after a successful identity update.
- `identifiers` is the complete set of canonical product identifiers. Supported `type` values are `upc`, `ean`, `gtin`, and `mpn`. Use `region: "all"` when an identifier is not region-specific.
- `retailer_listings` is the complete set of retailer product mappings. Each entry identifies a source, channel, and source-specific product ID. It may also contain `excluded_source_offer_ids`.
- `pricing_enabled` and `verified` are required booleans on every retailer listing.

The two arrays are full snapshots, not partial patches. Preserve existing entries when adding or changing one. For an ordinary specification-only edit, leave the entire `identifiers` object unchanged. Components without a canonical identity snapshot may omit the top-level object.

## The different meanings of `type`

The word `type` appears in several unrelated places:

- In a JSON Schema, `"type"` is a standard keyword describing a value as an object, string, number, array, and so on. It is not a component field.
- In `identifiers.identifiers[]`, `type` classifies an identifier as a UPC, EAN, GTIN, or MPN. This field is required and is not deprecated.
- In a Storage component, the public product field is `storage_type`, with values such as `SSD`, `HDD`, or `SSHD`.

The old top-level Storage product field `type` is deprecated and is no longer emitted by the OpenDB export. Do not add it to new or edited Storage records; use `storage_type` instead. Historical files may temporarily contain the old field until the next catalog data sync removes it.

## Schema maintenance

The repeated identity definition in every category schema is generated from the canonical BuildCores data model. Maintainers should regenerate and synchronize the schemas from BuildCoresBase instead of editing each generated schema by hand.

The BuildCores exporter also treats each canonical category specification schema as a field allowlist. It recursively copies only declared `v2Fields` properties, including properties inside object arrays, before adding OpenDB-specific fields such as `opendb_id` and `identifiers`. Persisted database-only or removed fields are therefore omitted from the next generated seed without category-specific cleanup rules.
