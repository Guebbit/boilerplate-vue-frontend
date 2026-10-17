---
source: src/modules/cart/tests/module-badge-account-switch.spec.ts
sha256: 4b9727b40c00376eab406f7761a3e8237c82bda0736a4620e6a5d5516cad261e
generated_at: 2026-10-17T00:41:54.232484+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/module-badge-account-switch.spec.ts

## Purpose

Vitest spec that verifies the cart badge's session watcher re-seeds the cart when a new account takes over the tab without an intervening sign-out. Without this behavior the header would show an empty cart to the new viewer, and any leftover guest cart would not be merged.

## Key elements

- **`describe('another account taking the tab over')`** — the single scenario block for the account-switch case.
- **`it('is seeded for, like any session that appears')`** — sets viewer A, runs the badge inside an `effectScope`, then swaps to viewer B; asserts `seedAfterSignIn` was called once per viewer (total 2).
- **`beforeEach`** — clears `sessionStorage` and resets the active Pinia instance so each test starts from a clean store.

## Relationships

- **`src/modules/cart/module.ts`** — the module under test; the test calls `cartModule.navigation[0].badge()` to activate the session watcher.
- **`src/modules/cart/store.ts`** — provides `useCartStore`; the test spies on `seedAfterSignIn` to assert it is invoked for each new viewer.
- **`tests/support/stub.ts`** — exports `asStub`, used to fabricate minimal `SessionViewer` objects (`{ id, email }`) without pulling in a full session mock.

## Notes

- The badge is invoked inside `effectScope().run(...)` rather than at module top-level, which is required for the internal `watch` to register against the correct reactive scope.
- The test does **not** assert cart contents or badge DOM state—only that the seeding call fires. Full integration of the reset-then-seed sequence lives elsewhere.
- `session.setAbilities(...)` is called with a tenant ability for `Cart` update; omitting it could leave the store's ability gate closed and prevent the seed call.
