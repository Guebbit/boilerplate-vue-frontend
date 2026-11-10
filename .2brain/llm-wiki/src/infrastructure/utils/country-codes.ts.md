---
source: src/infrastructure/utils/country-codes.ts
sha256: 05ab0f8167e7eb8bbe6e56bc6d64333d6895446cb17db29aa52372d5675966af
signature: f139b743b0a3146240a7e60952ee30f550d87116f192f0889447d2cd1f6181e2
generated_at: 2026-11-10T03:10:51.190095+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/country-codes.ts

## Purpose

Static reference data containing the full list of current ISO 3166-1 alpha-2 country codes. It exists as a plain in-repo constant to avoid a runtime dependency (`i18n-iso-countries`) whose last release fell outside the repo's 12-month maintenance window. There is no logic in this file—only data.

## Key elements

- **`ISO_COUNTRY_CODES: readonly string[]`** — The sole export. An alphabetically ordered array of every current ISO 3166-1 alpha-2 code (e.g. `'AD'` … `'ZW'`). Typed as `readonly` so consumers cannot mutate it. Each entry matches the `^[A-Z]{2}$` shape enforced by the `CountryCode` contract type.

## Relationships

No graph neighbors are recorded for this file. The module doc-comment notes that display names are resolved at call sites via a `countryLabel` helper rather than being stored alongside the codes here.

## Notes

- The list is **intentionally incomplete-looking** to a quick scan: codes like `'BV'` (Bouvet Island), `'IO'` (British Indian Ocean Territory), and `'AQ'` (Antarctica) are present because ISO 3166-1 assigns alpha-2 codes to territories and special areas, not just sovereign states.
- Do **not** add display-name strings here. The project convention is to look them up dynamically by code (see `countryLabel`), keeping this file a pure code index.
- Adding or removing a code is a data change, not a code change; there is no build step or generation pipeline involved.
