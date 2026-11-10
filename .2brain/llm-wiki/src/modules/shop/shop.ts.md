---
source: src/modules/shop/shop.ts
sha256: 2f64a988a7046cc01b5180d950cea689aef0187da6044f5f4b671ba2238625ac
signature: 903f574cc73b8a426dd280bdfc1581cf718071ab57739bf3eff5b6c09f3e10d9
generated_at: 2026-11-10T05:45:00.983825+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop/shop.ts

## Purpose

Module-level holder for the shop's static settings (currency, shipping countries, time zone, backorder promise), fetched once from `GET /shop` and exposed as Vue reactive read-only views. It exists so that price-input sizing, address-form validation, and backorder labeling all draw from a single shared source rather than each component re-fetching.

## Key elements

- **`shop`** (ref) — the raw loaded `Shop` record; `undefined` until loaded.
- **`loading`** (module-local) — deduplicates concurrent/repeated `loadShop` calls onto one in-flight request.
- **`shopRecord`** (readonly) — read-only view of the entire record.
- **`shopCurrency`** (computed) — ISO 4217 code; `''` until known.
- **`shopMinorUnits`** (computed) — currency decimal places (e.g. JPY → 0); `undefined` until known.
- **`shipToCountries`** (computed) — allowed ship-to list; `[]` until known (read as "unrestricted" by the address form).
- **`backorderPromiseDays`** (computed) — days promised when no restock date exists; `undefined` until known.
- **`shopTimeZone`** (computed) — IANA time-zone string; `''` until known.
- **`loadShop()`** — fetches once; logs and swallows failures (resolves `undefined`), resets the in-flight slot so a retry is possible. Never rejects.
- **`resetShop()`** — clears both `shop` and `loading`; intended for test isolation.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — imports `logger` to record failures inside `loadShop`'s catch block.
- **`src/modules/shop/index.ts`** — barrel re-export of this module's public API to the rest of the app.
- **`src/modules/shop/module.ts`** — Vue feature module that wires this file into the component tree.
- **`src/modules/shop/tests/shop.spec.ts`** — spec file; relies on `resetShop` to clear shared module state between cases.

## Notes

- "Shop" here is a site-wide setting, **not** a Shopify product/catalog concept. Do not conflate with a `Shop` resource that carries per-item fields.
- Unknown currency/timezone intentionally resolve to `''` (not a guessed default like `EUR`) so that a missing value is visible rather than silently wrong.
- `loading` is set back to `undefined` on failure, making the next `loadShop()` call a genuine retry — the endpoint is public, so a failure is assumed to be transient/network.
- Module state is process-wide; any test that mutates or asserts shop values must call `resetShop` in `beforeEach` (or equivalent) to avoid cross-case leakage.
