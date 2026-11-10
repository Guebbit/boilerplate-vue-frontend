---
source: src/app/tours/tours.generated.ts
sha256: f173148663d8ce21d0cc234ae13d83624b2820f4b0ecf1f2ae89894d6902691e
signature: 89ecfbc192db585e472113a857820e904d4510b61176c16b6e0a3c4791b949af
generated_at: 2026-11-10T02:57:26.786310+00:00
model: ollama:qwen3.8:27b
---

# src/app/tours/tours.generated.ts

## Purpose

Auto-generated lookup table of all tour IDs and their metadata (version, auto-trigger flag) available in the current build. It exists so that runtime code can reference the authoritative set of tours without parsing YAML at runtime; the source of truth is `shared/rules/tours.yaml`.

## Key elements

- **`TOUR_DATA`** (`as const` object) — A frozen map from tour ID to its configuration. Each entry carries a numeric `version` and, optionally, an `auto: true` flag (currently only `welcome`). The four known IDs are `welcome`, `checkout`, `order-staff`, and `stock-board`.

## Relationships

- **`src/app/tours/catalogue.ts`** — Imports `TOUR_DATA` to register or enumerate the available tours (building a catalogue, validating IDs, or seeding a registry).

## Notes

- **Do not edit by hand.** The header comment and `npm run regenerate` script (which reads `shared/rules/tours.yaml`) overwrite this file. Add or change tours in the YAML source.
- The `as const` annotation means every property is a literal type; consumers get narrow string/number types for free without additional typing.
- `auto: true` is present on `welcome` and absent elsewhere; its meaning (e.g., "run without explicit user trigger") should be confirmed in the consuming code in `catalogue.ts`.
