---
source: src/modules/cart/tests/module-badge.spec.ts
sha256: f0a8e0689f2c4140c75578a8e919222a02a74e1ffb4c1c5430855cf3f1306ff1
signature: ff7b168db82855cb7dc9ff7cfca155d2c92e4dbf79ebe7629145c101e8b1933b
generated_at: 2026-11-10T04:08:50.644159+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/module-badge.spec.ts

## Purpose

Tests the cart badge's session watcher (wired via `module.ts`'s navigation entry). Verifies two invariants: a checkout draft is cleared when the signed-in visitor logs out, but survives a page reload that starts signed-out and re-authenticates a moment later. Also confirms the badge calls `seedAfterSignIn` when a signed-in session appears.

## Key elements

- **`wireBadge`** — Runs the badge setup function exported by the cart module inside a fresh `effectScope`, mimicking how the application shell wires it.
- **`signIn`** — Sets a stub `SessionViewer` (`id: 'u1'`, `email: 'u1@example.com'`) and an `accessToken` on the session store.
- **`beforeEach`** — Clears `sessionStorage`, installs a fresh Pinia, and mocks `seedAfterSignIn` to a resolved no-op.
- **`describe('the cart badge watching the session')`** — Two specs: draft is wiped on logout (`accessToken` set to `undefined`); draft is preserved when session re-appears after an initial signed-out state.
- **`describe('the cart badge seeding itself…')`** — Asserts `seedAfterSignIn` is called exactly once after `signIn` + `wireBadge`.

## Relationships

- **`src/modules/cart/module.ts`** — The system under test. The test imports the module and invokes its badge setup function (obtained from the module's navigation entry) to exercise the session watcher.
- **`src/modules/cart/store.ts`** — `useCartStore` is used to spy on / mock `seedAfterSignIn`; the store's session-driven seeding is the behavior being asserted.
- **`src/modules/cart/composables/use-checkout-draft.ts`** — `writeCheckoutDraft` and `readCheckoutDraft` serve as the fixtures and assertions for draft persistence/eviction.
- **`tests/support/stub.ts`** — Provides `asStub<SessionViewer>` to create a minimal typed fake for the session store without pulling in the real implementation.

## Notes

- The "reload" spec is intentionally **non**-destructive: it calls `wireBadge` *before* `signIn`, so the badge registers in a signed-out state. The draft is written ahead of time and must survive the subsequent sign-in. The contrast with the logout spec (draft written *after* sign-in, then token removed) is the whole point of the pair.
- All async assertions await a single `nextTick()` after the triggering state change — the badge watcher is expected to be synchronous relative to the store update.
- `sessionStorage` is cleared in `beforeEach` because the checkout draft lives there; without this, a draft from a prior spec would leak into the next.
