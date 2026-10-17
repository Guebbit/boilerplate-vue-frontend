---
source: tests/unit/infrastructure/shop.spec.ts
sha256: 8a1b1f57d3e2c2ab85cdd9cf9cd1f871e0e2fe0e0347858d56a1b249e589d1c8
generated_at: 2026-10-17T02:38:57.215632+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/shop.spec.ts

## Purpose

Unit tests for the shop reactive store (`loadShop`, `shopCurrency`, `shipToCountries`). Verifies the store's contract: it starts empty, populates only from a real API response, deduplicates concurrent/repeated reads into a single request, and recovers from a failed fetch without ever emitting a guessed default.

## Key elements

- **`answering(overrides)`** – local helper that wraps the `aShop` fixture into the shape `getShop` is expected to resolve (`{ data: Shop }`).
- **`beforeEach`** – calls `resetShop()` and `vi.mocked(getShop).mockReset()` so every test starts from a clean, empty store.
- **"is empty until the read lands"** – asserts `shopCurrency.value === ''` and `shipToCountries.value === []` before any load.
- **"holds the currency and the ship-to countries"** – mocks a successful `getShop`, calls `loadShop()`, and asserts the reactive refs carry the reported values.
- **"asks once for concurrent and repeated readers"** – fires two `loadShop()` calls concurrently plus a third sequentially; asserts `getShop` was called exactly once.
- **"never rejects, stays empty, and asks again"** – mocks a rejected `getShop`; asserts `loadShop()` still resolves (undefined), state remains empty, and the next call retries successfully.
- **Mocks** – `@api.getShop` (via `importOriginal` to preserve other exports) and `@/infrastructure/utils/logger.ts` (silences `logger.error`).

## Relationships

- **`tests/support/unit/fixtures.ts`** – provides the `aShop` factory used by the `answering` helper to build realistic shop payloads for mock responses.
- **`@/infrastructure/shop.ts`** – the module under test; exports `loadShop`, `resetShop`, `shopCurrency`, `shipToCountries`.
- **`@api`** – source of `getShop`; fully mocked here so no network or HTTP layer is exercised.
- **`@/infrastructure/utils/logger.ts`** – mocked to a no-op `logger.error` to keep test output clean and prevent side effects.

## Notes

- The module docstring encodes the design invariant the tests enforce: *"one request however many readers ask, empty until known, retried after a failure — never a guessed default."* Any change to `shop.ts` that violates this (e.g., seeding a default currency) will fail the "empty until the read lands" and "never rejects" tests.
- `loadShop()` is expected to **resolve** (not reject) on API failure; the test asserts `resolves.toBeUndefined()`. Code that propagates the rejection will break the suite.
- The logger mock is necessary because the failure path in `shop.ts` calls `logger.error`; without it, Vitest would print the error or the mock for `@api` would be the only thing silencing it.
