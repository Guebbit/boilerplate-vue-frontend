---
source: src/infrastructure/shop-currency.ts
sha256: 3254d021a52a6525812ca7781ef10bff277951d1a7440aab935d4521f49300ec
generated_at: 2026-10-02T12:02:43.838893+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/shop-currency.ts

## Purpose

Holds the shop's single ISO 4217 currency code in a module-level Vue `ref`, loaded once from `GET /products/settings`. It exists so that any component that needs to size a price input or label a figure can do so before a per-product `currency` field is available, without each caller issuing its own request.

## Key elements

- **`shopCurrency`** — Exported `readonly` ref. Contains the currency code string (e.g. `"USD"`) or `''` until the load resolves. Safe to read synchronously for display purposes.
- **`loadShopCurrency()`** — Triggers the one-time fetch via `getProductSettings()`. Uses a module-level `loading` promise so concurrent callers share a single request. Never rejects; on failure it logs, resets `loading` (allowing a retry on the next call), and resolves with `''`.
- **`resetShopCurrency()`** — Clears `currency` and `loading` so the next `loadShopCurrency` call re-fetches. Intended for test teardown (module state persists across test cases).

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Imports `logger`; calls `logger.error` in the `catch` block when the settings endpoint fails, prefixing the message with `[ShopCurrency]`.
- **`@api` (`getProductSettings`)** — The sole data source. Called once per successful load cycle.

## Notes

- `shopCurrency` starts as `''`, **not** a guessed default. Callers that require a concrete code must `await loadShopCurrency()` before rendering; callers that only need to label an already-known figure can read `shopCurrency` directly.
- Because the module is a singleton, all callers in a given session share the same state. In tests, call `resetShopCurrency()` in a `beforeEach`/`afterEach` hook to avoid cross-test leakage.
- A failed load does **not** set a fallback currency; it simply leaves the ref empty. The next `loadShopCurrency` call will retry because `loading` is reset in the catch path.
