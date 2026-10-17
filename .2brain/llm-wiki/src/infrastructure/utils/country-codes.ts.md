---
source: src/infrastructure/utils/country-codes.ts
sha256: 05ab0f8167e7eb8bbe6e56bc6d64333d6895446cb17db29aa52372d5675966af
generated_at: 2026-10-17T00:12:32.492491+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/country-codes.ts

## Purpose

Provides the complete list of ISO 3166-1 alpha-2 country codes as a plain static constant. It exists so the codebase does not need a runtime dependency (e.g. `i18n-iso-countries`) for what is ultimately a fixed, well-known set of two-letter strings.

## Key elements

- **`ISO_COUNTRY_CODES: readonly string[]`** – Alphabetically ordered array of every current ISO 3166-1 alpha-2 code (e.g. `'AD'`, `'US'`, `'ZW'`). Exposed as a `readonly` tuple of `string`s; each value matches the `CountryCode` contract pattern `^[A-Z]{2}$`.

## Relationships

No dependency-graph neighbors. This file is a leaf: it imports nothing and is a pure data export.

## Notes

- Country *display names* are intentionally **not** stored here. The docstring points to a `countryLabel` lookup (lived elsewhere) that resolves a code to its human-readable name at runtime, keeping this file free of duplicated strings.
- The array is typed `readonly string[]`, not `as const`, so callers get a plain string array without a literal-union type. Treat entries as untyped `string` values; any code that needs the `CountryCode` contract should validate or cast at its own boundary.
- The list is static reference data. If ISO 3166-1 adds or retires codes, this array must be updated manually — there is no build-step or sync mechanism.
