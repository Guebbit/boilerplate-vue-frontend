---
source: src/modules/cart/tests/module-badge.spec.ts
sha256: 577cfc026ecdd2e7df583f89b246148d6ca8ffa8af106b43e5a69afbb33e2425
generated_at: 2026-10-17T00:42:04.744554+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/module-badge.spec.ts

## Purpose

Vitest spec for the cart badge's session watch (defined in `module.ts`). It verifies two behavioral contracts: (1) the checkout draft is destroyed when a signed-in user logs out, but survives a page-reload sequence (signed-out → session restored); and (2) the badge calls `seedAfterSignIn` only when the session actually holds the `update Cart` tenant ability.

## Key elements

- **`wireBadge`** — Invokes the first navigation entry's `badge()` setup from `cartModule` inside a dedicated `effectScope`, mirroring how the shell wires it.
- **`signIn`** — Populates the Pinia session store with a stub viewer (`id: 'u1'`), an access token, and the `['update', 'Cart']` tenant ability.
- **Test: "drops the checkout draft…"** — Signs in, wires the badge, writes a draft, then clears `accessToken`; asserts the draft is reset to `{ notes: '' }` after `nextTick`.
- **Test: "keeps the draft through a reload…"** — Writes a draft *before* wiring the badge, then signs in (simulating restore); asserts the draft is unchanged.
- **Test: "seeds for a session that may shop"** — Confirms `seedAfterSignIn` is called exactly once when the ability is present.
- **Test: "never seeds for a session that holds no cart key"** — Clears all abilities; asserts `seedAfterSignIn` is never called.

## Relationships

- **`src/modules/cart/module.ts`** — Imports `cartModule` to reach `navigation[0].badge`, the SUT.
- **`src/modules/cart/store.ts`** — Imports `useCartStore` solely to spy on `seedAfterSignIn` and assert call counts.
- **`src/modules/cart/composables/use-checkout-draft.ts`** — Imports `readCheckoutDraft` / `writeCheckoutDraft` to set up and verify draft state in `sessionStorage`.
- **`tests/support/stub.ts`** — Imports `asStub<SessionViewer>` to build the minimal session viewer fixture.

## Notes

- All assertions run after `nextTick()` because the badge's watch callback is a Vue reactive effect; synchronous checks would miss the update.
- `seedAfterSignIn` is mocked in `beforeEach` **and** re-mocked inside individual tests; the per-test mock is the one whose call-count is asserted (the `beforeEach` mock is a safety net to prevent real network calls).
- The "reload" test deliberately writes the draft *before* `wireBadge()` so the badge's watch sees a signed-out state first, matching the real page-load sequence.
- The ability gate is specifically `tenant: [['update', 'Cart']]`; any other tenant ability list (including an empty array) must suppress seeding.
