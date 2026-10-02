---
source: src/infrastructure/utils/country-codes.ts
sha256: 27d2788153a3fe19743dac0fa2dcc6c6be8b6aa3c53e23926b4d01655d7a7b65
generated_at: 2026-10-02T12:03:18.405724+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/country-codes.ts

## Purpose

A static, dependency-free list of all current ISO 3166-1 alpha-2 country codes. It exists as a plain constant so that consumers can enumerate valid codes (e.g., for form dropdowns, validation) without pulling in a runtime library.

## Key elements

- **`ISO_COUNTRY_CODES: readonly string[]`** — Alphabetical array of every current alpha-2 code (e.g. `'US'`, `'DE'`, `'JP'`). Typed `readonly` so callers cannot mutate the list.

## Relationships

No graph neighbors. This file has no imports and is consumed by whatever layer needs the full code list (e.g., a `countryLabel` lookup helper or a `CountryCode` contract type).

## Notes

- **No display names stored here.** Each code's human-readable label is resolved at call time via a separate `countryLabel` utility; this file intentionally avoids duplicating names to prevent drift.
- **Library deliberately not used.** `i18n-iso-countries` was evaluated and rejected because its last release falls outside the repo's 12-month maintenance rule (see `DECISIONS_0925_2_SHOP_SCOPE.md`, entry E12). The list is maintained inline instead.
- **Shape contract.** Every entry satisfies the `^[A-Z]{2}$` pattern enforced by the `CountryCode` type in the contract layer.
