---
source: src/modules/cart/tests/module-badge.spec.ts
sha256: 6a6ed57ca16c01c16b06bd6ca0dfd93104db8ceeb87f4abcdb948244b3f066e6
generated_at: 2026-10-02T15:02:18.466441+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/module-badge.spec.ts

## Purpose

Tests the cart badge's session watch (defined in `cart/module.ts`): verifying that the checkout draft is cleared when a signed-in visitor logs out, and that it survives a page reload (which momentarily drops the session before restoring it).

## Key elements

- **`wireBadge`** — helper that grabs `cartModule.navigation[0].badge` and runs it inside a fresh `effectScope`, mirroring how the app shell wires it up.
- **`signIn`** — helper that sets a stub `SessionViewer` and a fake `accessToken` on the session store.
- **`beforeEach`** — resets `sessionStorage`, creates a fresh Pinia, and mocks `useCartStore().fetchSummary`.
- **Test: "drops the checkout draft when the signed-in visitor logs out"** — signs in, wires the badge, writes a draft, then clears `accessToken`; asserts the draft is wiped to `{ notes: '' }`.
- **Test: "keeps the draft through a reload, which starts signed out and is restored a moment later"** — writes a draft first (session not yet set), wires the badge, then signs in; asserts the draft is intact after `nextTick`.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub` to construct a minimal `SessionViewer` object for the `signIn` helper, avoiding the need for a real session payload.

## Notes

- The badge setup is invoked via `effectScope().run(...)` so its reactive effects are scoped and will be torn down when the scope is GC'd; the tests rely on this to avoid leaking watchers between cases.
- The reload scenario is simulated by calling `writeCheckoutDraft` *before* `signIn` (i.e., before the badge's effect fires), so the badge's "session went null" path is never triggered. The test asserts the draft is *not* wiped in that ordering.
- `sessionStorage` is cleared in `beforeEach` because the checkout draft is persisted there via `use-checkout-draft.ts`.
