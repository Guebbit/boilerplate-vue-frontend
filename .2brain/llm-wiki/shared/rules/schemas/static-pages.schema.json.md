---
source: shared/rules/schemas/static-pages.schema.json
sha256: 99dc2d4bdddaad179a77848423d6e0b93412c3904ec1774fb11398d1bba07bef
signature: 18c1549c1aa0a66746e8ccbdfc6730a904b0e0034dedc003de8a5644d2f5c964
generated_at: 2026-11-10T02:48:19.636834+00:00
model: ollama:qwen3.8:27b
---

# shared/rules/schemas/static-pages.schema.json

## Purpose

A JSON Schema (draft 2020-12) that validates the structure of a static-pages configuration object. It enforces that the object contains exactly one required `pages` property — a non-empty array of lowercase-letter slugs — and rejects any extra top-level keys.

## Key elements

- **`pages` (required, array)** — Must contain at least 1 item (`minItems: 1`). Each element must be a string matching `^[a-z]+$` (one or more lowercase a–z characters, no digits, hyphens, dots, or uppercase).
- **`additionalProperties: false`** — The top-level object is closed; any property other than `pages` causes a validation error.

## Relationships

No dependency-graph neighbors are recorded for this file.

## Notes

- The slug pattern `^[a-z]+$` is deliberately restrictive: it permits no hyphens, underscores, digits, or path separators. If static page slugs ever include those characters, the pattern must be widened before validation is run against them.
- Because `additionalProperties` is `false`, adding a new top-level field (e.g. `title` or `locale`) to the configuration object will break validation unless the schema is updated in the same change.
