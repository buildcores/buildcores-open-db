# Contributing to BuildCores OpenDB

Thank you for your interest in contributing to BuildCores OpenDB! This document provides guidelines and instructions for contributing.

## Licensing and Contributor Permissions

[NOTICE.md](NOTICE.md) defines the scope of [CC BY-NC-SA 4.0](LICENSE.txt). Contributors retain ownership; commercial sublicensing of their protected material requires an express grant or other verified authority.

- Identify sources, third-party restrictions, original protected content, and incorporated third-party material. Public availability does not establish permission to copy protected content.
- Where needed, arrange private acceptance of the completed [contributor agreement](docs/licensing/CONTRIBUTOR_AGREEMENT.md) before merge. A PR or checkbox is not acceptance; keep legal identities and signatures private.
- Maintainers must verify authority, retain exact grant and acceptance records, and add coverage to `NOTICE.md` before release. Hold protected contributions needing a commercial grant until it is verified. Review is manual.

## Getting Started

### Types of Contributions

- Adding new PC components
- Updating existing component information
- Correcting errors in component data
- Improving schemas for better validation

### Adding a New Component

1. Identify the appropriate category folder in `/open-db/` (e.g., CPU, GPU, RAM)
2. Create a new JSON file in that folder
   - You must generate a UUID v4 for the new component
   - Use this UUID as both the filename (e.g., `12345678-1234-5678-1234-567812345678.json`) and in the `opendb_id` field within the JSON content
   - The API requires this UUID and will not auto-assign one
3. Populate the JSON file according to the appropriate schema in `/schemas/`
4. Make sure all required fields are included

### Updating an Existing Component

1. Find the component's JSON file in the appropriate category folder
2. Make the necessary changes while maintaining schema compliance
3. Do not change the `opendb_id` field as this is the unique identifier

### Adding Product Variants

When adding a variant of an existing product (e.g., a different color or speed tier):

1. **Search for existing variants** in the category folder first
2. **Copy the exact `manufacturer` and `series` values** from an existing sibling variant
3. **Only change the `variant` field** and variant-specific attributes (like color or speed)

For detailed guidance, see [docs/VARIANTS.md](docs/VARIANTS.md).

### Data Quality Guidelines

- Use consistent naming conventions for similar components
- Provide accurate specifications based on manufacturer documentation
- Include retailer SKUs and links when available
- Ensure all measurements use the correct units as specified in the schema
- Fill in as many fields as possible, not just the required ones
- When adding variants, match the exact spelling of existing `manufacturer` and `series` fields

## Validation

### Local Validation

TODO

### PR Validation

When you submit a PR:

1. GitHub Actions will automatically validate your changes
2. The validation results will be posted as a comment on your PR
3. If validation fails, you'll need to fix the issues before merging

## Submitting Changes

1. Commit your changes with a descriptive message
   ```
   git commit -am "Add Intel Core i9-14900K CPU"
   ```
2. Push to your fork
   ```
   git push origin your-feature-branch
   ```
3. Submit a pull request to the main repository
4. In your PR description:
   - Explain what your changes do
   - Reference any related issues
   - Note the source of your data if applicable
