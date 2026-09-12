# NZXT feed audit — 12 September 2026

Audited the [NZXT product feed](https://nzxt.com/pages/xml-feed) against the public BuildCores Standard catalog and this OpenDB checkout. The feed contains **153 sellable variants** from **87 product pages**. Counts use feed variants, rather than unique catalog records; duplicate catalog records do not inflate coverage.

**Result before this change:** 110 variants are present in BuildCores, 41 are missing, and 2 ASUS ROG Azoth color variants have a matching family but need exact-variant review. The feed labels third-party products as NZXT; ASUS, Logitech, and MSI were matched under their actual manufacturers.

| Category        | Feed variants | Present | Missing | Variant review |
| --------------- | ------------: | ------: | ------: | -------------: |
| PCCase          |            26 |      25 |       1 |              0 |
| CPUCooler       |            19 |      19 |       0 |              0 |
| CaseFan         |            56 |      46 |      10 |              0 |
| Motherboard     |            10 |       5 |       5 |              0 |
| PSU             |            12 |       8 |       4 |              0 |
| Keyboard        |             3 |       1 |       0 |              2 |
| Mouse           |             2 |       2 |       0 |              0 |
| Mousepad        |            12 |       0 |      12 |              0 |
| Monitor         |             4 |       4 |       0 |              0 |
| PrebuiltDesktop |             9 |       0 |       9 |              0 |

## Changes delivered

**41 new OpenDB files** in this PR, plus one C1000 identity correction. The original checkout needed 25 additional exports of products already live in BuildCores; those files are already present on the latest upstream `main` and are not changed in this PR. New products use UUID v4. Manufacturer URLs and supported specifications are included. All 42 changed component files passed category JSON Schema validation, recursive allowed-field checks, and UUID/filename checks. The audit preserves the original live/catalog baseline; `pr_action` records the final scope against upstream commit `eec0df175504ebd15f0f3e3a8249a18a22f00940`.

The existing C1000 file incorrectly included the `PA-0G3BB-US` Gold Core SKU alongside older revisions. Removed that alias from both metadata and the canonical identity snapshot, preserving the snapshot version and all other identifiers/retailer mappings, and created a separate C1000 Gold Core entry. Other duplicate and conflicting records are listed below for review. No catalog records were deleted.

**Live image update:** [NZXT N9 Z890 Black](https://www.buildcores.com/products/Motherboard/otisqsz55/NZXT-Z890-N9-LGA1851-DDR5-ATX) now has one main image and five black-variant gallery images. The editor review contained only `image` and `multi_image` changes, and the public API independently returned the saved URLs. The public product page visibly renders the new gallery. Existing pictures on other matched records were preserved.

The original feed `/files/` image URLs can return 404, and 21 feed rows have the homepage as their image URL. Resolved primary images using each official Shopify product’s exact variant image ID, matching source filename, or explicit model/color hero image. Mixed-color galleries in the feed were not copied wholesale. All 151 unique resolved primary URLs returned HTTP 200 with an image content type. See the image manifest for resolved URLs.

OpenDB schemas do not expose image fields. New product image URLs are therefore supplied in a separate audit manifest rather than unsupported fields in the component files. Mousepad and PrebuiltDesktop schemas currently expose only identity/general product information; full feed specifications are preserved in the evidence file. New entries are local changes and have not been merged or synchronized to the live catalog.

## Matching identifiers for the 41 missing variants

All 41 have an MPN stored in their OpenDB entry and a verified working primary image in the image manifest. 28 have a nonempty feed GTIN; 13 do not. All 28 supplied GTINs pass the check-digit test, which confirms syntax rather than ownership. MXP700, MMP400, and MXL900 each reuse one GTIN across all three colors, and Player Three Prime uses the same GTIN for black and white. Use exact MPN as the primary variant match; do not treat those shared GTINs as unique color identifiers. The latest upstream schemas support canonical product identifiers. All 41 new records include canonical MPNs; the 17 variants with non-shared feed GTINs also include those values as UPC identifiers. The 11 shared-GTIN assignments are preserved in the audit/manifest but omitted from canonical identifiers to avoid ambiguous variant matches. No retailer mappings are invented. All feed GTINs and resolved image URLs are retained in the audit/manifest; image fields are not supported by OpenDB.

## Missing products added

### PCCase (1 variants)

- H2 Flow | PC Cases | White — `CI-H21FW-01`

### CaseFan (10 variants)

- F360X | Case Fans | Black — `RF-U36PN-B1`
- F360X | Case Fans | White — `RF-U36PN-W1`
- F280X | Case Fans | Black — `RF-U28PN-B1`
- F280X | Case Fans | White — `RF-U28PN-W1`
- F240X | Case Fans | Black — `RF-U24PN-B1`
- F240X | Case Fans | White — `RF-U24PN-W1`
- F140X | Case Fans | Black — `RF-U14PN-B1`
- F140X | Case Fans | White — `RF-U14PN-W1`
- F120X | Case Fans | Black — `RF-U12PN-B1`
- F120X | Case Fans | White — `RF-U12PN-W1`

### Motherboard (5 variants)

- N7 Z890 | Motherboards | White — `N7-Z89XT-W1`
- N7 Z890 | Motherboards | Black — `N7-Z89XT-B1`
- N9 Z890 | Motherboards | White — `N9-Z89XT-W1`
- N7 B850 | Motherboards | White — `N7-B85XT-W1`
- N7 B850 | Motherboards | Black — `N7-B85XT-B1`

### PSU (4 variants)

- C1000 Gold Core | Power Supplies | Black — `PA-0G3BB-US`
- C850 Gold Core | Power Supplies | Black — `PA-8G3BB-US`
- C750 Gold Core | Power Supplies | Black — `PA-7G3BB-US`
- C750 Bronze | Power Supplies | Black — `PA-7B3BB-US`

### Mousepad (12 variants)

- NZXT Zone Elite XL | Mousepads | Black — `MM-XLGPR-BK`
- NZXT Zone Elite (XXL) | Mousepads | Black — `MM-2XLPR-BK`
- NZXT Zone Elite | Mousepads | Black — `MM-LRGPR-BK`
- MXP700 | Mousepads | White — `MM-MXLSP-WW`
- MXP700 | Mousepads | Grey — `MM-MXLSP-GR`
- MXP700 | Mousepads | Black — `MM-MXLSP-BL`
- MMP400 | Mousepads | White — `MM-SMSSP-WW`
- MMP400 | Mousepads | Grey — `MM-SMSSP-GR`
- MMP400 | Mousepads | Black — `MM-SMSSP-BL`
- MXL900 | Mousepads | White — `MM-XXLSP-WW`
- MXL900 | Mousepads | Grey — `MM-XXLSP-GR`
- MXL900 | Mousepads | Black — `MM-XXLSP-BL`

### PrebuiltDesktop (9 variants)

- Player One | Prebuilt Gaming PCs | Black — `PB1-1BAS102-BL`
- Player One Prime | Prebuilt Gaming PCs | Black — `PB1-1PRS102-BL`
- Player Two | Prebuilt Gaming PCs | Black — `PB1-2BAP102-BL`
- Player Two Prime | Prebuilt Gaming PCs | Black — `PB1-2PRP101-BL`
- Player Two Prime | Prebuilt Gaming PCs | White — `PB1-2PRP101-WH`
- Player Three | Prebuilt Gaming PCs | Black — `PB1-3BAP101-BL`
- Player Three | Prebuilt Gaming PCs | White — `PB1-3BAP101-WH`
- Player Three Prime | Prebuilt Gaming PCs | Black — `PB1-3PRU101-BL`
- Player Three Prime | Prebuilt Gaming PCs | White — `PB1-3PRU101-WH`

## Records needing review

- **ASUS ROG Azoth, black/white:** NZXT store SKUs `BK-M701PBL-AU0` and `BK-M701PWH-AU0` do not identify switches or regional keyboard layout. The image-less live family record `xojs4xv3t` combines several manufacturer SKUs and colors. Preserved that family’s existing OpenDB UUID and flagged its pictures for review; assigning a single color could misrepresent part of the combined record. Existing switch-specific Azoth records already have images.

- **H7 Flow Black / RGB Black:** `044572aa-2cb1-4b2a-b42d-e3554cc27309` claims both non-RGB and RGB MPNs despite its non-RGB name. The dedicated RGB record was used for RGB coverage.
- **Kraken Plus / Elite:** `e10a2e74-8683-4045-8af3-5c40f8df8c04` claims the Elite 360 MPN despite its Plus name. The dedicated Elite record was used. The live Core 240 record also claims a Plus 240 alias; dedicated records were used.
- **C1000:** live data still combines 2022/2024/Core part numbers. The OpenDB alias repair is pending merge; the remaining older revision conflict warrants a separate spec audit.
- **Other duplicate SKU records:** F120Q Black (2024), C850 Gold ATX 3.1 Black, C1200 Gold ATX 3.1 White, and H7 Flow Black have multiple records. Their IDs are retained in the CSV; this audit does not deduplicate them.

## Existing NZXT inventory and scope

The public catalog query returned **447 NZXT records** across cases, coolers, fans, motherboards, and PSUs. **340 records** were not matched to the current feed; these are not automatically obsolete or invalid. The local checkout originally contained 478 NZXT records and can differ from live data. The inventory CSV records both feed presence and local-file presence.

This is an official Standard catalog audit. Temp and community collections were not examined. Name/model matches are supported by color, revision, pack quantity, and feed specifications; ambiguous matches remain explicitly flagged.

## Files

- [Full variant audit (CSV)](audit.csv)
- [Machine-readable audit](audit.json)
- [Existing NZXT inventory](existing-nzxt-inventory.csv)
- [Resolved image manifest](image-manifest.json)
- [Image URL verification](image-health.json)
- [Feed specification evidence](feed-spec-evidence.json)
- [Verified live image change](live-image-change.json)
- [OpenDB edit backup](opendb-backups.json)
