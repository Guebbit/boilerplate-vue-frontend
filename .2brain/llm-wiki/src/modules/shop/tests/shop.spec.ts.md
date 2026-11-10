---
source: src/modules/shop/tests/shop.spec.ts
sha256: 5dae8bbdcc2ac647b2adb549cca967cfa176ef703b169a73a4821bf6df8e67fd
signature: 7716a397d7f31cb4fa88316e1dda51fa7217719959d896116d7f534a8e068f14
generated_at: 2026-11-10T05:45:27.993883+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop/tests/shop.spec.ts

## Purpose

Vitest spec for the shop store. Verifies the module's contract: the store starts empty (never a guessed default), holds whatever the API reports, deduplicates concurrent/repeated reads into a single request, recovers cleanly from a failed call, and loads once when the module boots.

## Key elements

- **`beforeEach`** — calls `resetShop()` and `vi.mocked(getShop).mockReset()` so every test starts from a clean slate.
- **`answering(overrides)`** — thin wrapper around the `aShop` fixture; returns a fully-formed shop object with caller-supplied overrides for `currency` / `shipToCountries`.
- **`describe('the shop store')`** — five cases:
  - *empty until the read lands* — asserts `shopCurrency.value === ''` and `shipToCountries.value === []` before any API call.
  - *holds the currency and ship-to countries* — mocks a resolved `getShop`, calls `loadShop()`, asserts both stores reflect the response.
  - *asks once for concurrent and repeated readers* — fires `Promise.all([loadShop(), loadShop()])` plus a third sequential call; asserts `getShop` called exactly once.
  - *never rejects, stays empty, and asks again* — first call rejects (`mockRejectedValueOnce`); asserts `loadShop()` resolves (via `toBeUndefined()`) and stores stay empty; second call succeeds and populates stores.
  - *loads the shop when the module sets itself up at boot* — invokes the imported module's boot hook, then `loadShop()`; asserts single `getShop` call and populated `shopCurrency`.
- **`vi.mock('@api')`** — preserves original module exports, replaces `getShop` with a spy.
- **`vi.mock('@/infrastructure/utils/logger.ts')`** — stubs `logger.error` to isolate the store from logging side-effects.

## Relationships

- **`src/modules/shop/shop.ts`** — under test. Provides `loadShop`, `resetShop`, `shipToCountries`, and `shopCurrency` (the reactive stores being asserted on).
- **`src/modules/shop/module.ts`** — imported as `shopModule`; one test exercises the module's boot path to confirm it triggers a shop load.
- **`tests/support/unit/fixtures.ts`** — source of the `aShop` factory used by the `answering` helper to build realistic mock payloads.

## Notes

- The "never a guessed default" contract is intentional: initial values are `''` and `[]`, **not** a sensible-looking fallback like `'EUR'`. If you change defaults in `shop.ts`, this test will fail by design.
- `loadShop()` never rejects — on API failure it resolves (asserted via `toBeUndefined()`) and leaves stores untouched. Tests assert the *resolve* path, not a thrown error.
- The `@api` mock spreads `importOriginal()` so other exports from that package remain available; only `getShop` is spied on.
