---
source: src/modules/cart/tests/module-badge-account-switch.spec.ts
sha256: 328264491377844698a6ed72f9be88ba7ed1f6ce25590849c29ff246c73cd788
signature: 328264491377844698a6ed72f9be88ba7ed1f6ce25590849c29ff246c73cd788
generated_at: 2026-11-10T04:08:32.104075+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/module-badge-account-switch.spec.ts

## Purpose

Verifies that the cart badge re-seeds itself (via `seedAfterSignIn`) when a different account's session appears in the same tab without an intervening sign-out. Guards against a regression where the store resets for the previous user but the badge never repopulates for the new one, leaving a visible user with a bare cart icon.

## Key elements

- **`beforeEach`** — clears `sessionStorage` and installs a fresh Pinia instance so each test starts clean.
- **`it('is seeded for, like any session that appears')`** — the single test case. Spies on `useCartStore().seedAfterSignIn`, drives the session store from viewer A to viewer B, and asserts the spy is called once per distinct viewer. Uses `effectScope().run()` to execute the badge effect and `nextTick()` to let reactive watchers settle.
- **`asStub<SessionViewer>({ id, email })`** — builds a minimal `SessionViewer` object sufficient for the session store without pulling in the real infrastructure.

## Relationships

- **`src/modules/cart/module.ts`** — the test imports `cartModule` and invokes its `badge()` reactive effect (accessed via `cartModule.navigation?.[0]?.badge()`) inside an `effectScope` to trigger the behavior under test.
- **`src/modules/cart/store.ts`** — the test imports `useCartStore` to place a spy on `seedAfterSignIn` and verify the badge triggers a re-seed when the account switches.
- **`tests/support/stub.ts`** — the test imports `asStub` to construct the minimal `SessionViewer` instances used to simulate the account switch.

## Notes

- The badge is invoked inside `effectScope().run(...)`, not called as a plain function, because it is a Vue reactive effect. Forgetting the scope (or the `nextTick` await) would make the assertion race the effect's internal scheduling.
- `sessionStorage.clear()` in `beforeEach` hints that the store or badge persists per-tab state there; omitting it can leak state between tests.
- The test is deliberately single-case: it covers the *positive* path only (seed is called). It does not assert that the badge is *absent* for the previous account or that a guest cart is discarded.
