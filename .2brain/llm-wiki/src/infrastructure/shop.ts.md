---
source: src/infrastructure/shop.ts
sha256: 04a866509874a456e39b99475375de941ee605df71983d2eb580f715dea78e94
generated_at: 2026-10-17T00:12:19.498902+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/shop.ts

## Purpose

Module-level singleton that fetches the shop's configuration (currency, ship-to countries, seller identity, returns destination) once via `GET /shop` and exposes it through Vue reactive refs. It exists so that any part of the app can read shop-wide settings without each component issuing its own request, and so that a currency code is available even before a specific product/resource carries one.

## Key elements

- **`shopRecord`** – `readonly` ref of the full `Shop` object; `undefined` until loaded. Consumed by the Terms page for the seller's identity.
- **`shopCurrency`** – `computed` ISO 4217 code; resolves to `''` (not a guessed default) while unknown.
- **`shipToCountries`** – `computed` array of shipping destinations; `[]` while unknown, which the address form interprets as "unrestricted".
- **`loadShop()`** – Fetches the shop once and caches the promise. Concurrent/repeated callers share the same in-flight request. Never rejects; on failure it logs the error, clears the cached promise, and returns `undefined` so the next call retries.
- **`resetShop()`** – Clears both the cached value and the in-flight promise. Intended for tests, which share this module's state across cases.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – `loadShop`'s `.catch` block calls `logger.error` to surface a failed fetch. No other interaction with the logger.
- **`@api` (`getShop`)** – The sole network call; the module does not issue any other HTTP requests.

## Notes

- The module is **not** a per-product field (despite the `Shop` type name from Shopify). It is a global setting consulted before any resource exists.
- `shopCurrency` intentionally returns `''` rather than a fallback like `'EUR'`—a silent default would silently misprice every non-EUR shop.
- Because the module is a singleton with mutable module-level state, any test suite that exercises it should call `resetShop()` in teardown to avoid cross-test contamination.
- `loadShop` is idempotent in the success path (subsequent calls return the already-resolved promise) but **not** in the failure path (the next call retries), since the endpoint is public and a failure is treated as transient.
