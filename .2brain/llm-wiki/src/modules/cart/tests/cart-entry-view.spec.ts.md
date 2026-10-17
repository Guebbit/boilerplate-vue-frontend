---
source: src/modules/cart/tests/cart-entry-view.spec.ts
sha256: 0f5f40398c53dbfc31f1a769ab418e7cbbbcd7970e3e34300c44d51d17218268
generated_at: 2026-10-17T00:37:30.039774+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-entry-view.spec.ts

## Purpose

Vitest spec that verifies the single routing decision in `CartEntry.vue`: a guest is shown the guest cart, a signed-in visitor is shown the real cart, and the view swaps reactively when a guest signs in. The actual cart screens are mocked out because they are tested in their own specs.

## Key elements

- **`vi.mock('../views/Cart.vue')` / `vi.mock('../components/GuestCart.vue')`** — Replace the two child screens with minimal `data-test` stubs so the spec only asserts *which* one is rendered.
- **`signIn()`** (local helper) — Populates the Pinia `useSessionStore` with both `accessToken` and a `viewer` object, which together satisfy the `isAuth` check inside `CartEntry.vue`.
- **`describe('the cart route')`** — Three cases:
  - *guest sees guest cart* — mounts with a fresh (empty) session; asserts only the guest stub is present.
  - *signed-in visitor sees the real cart* — calls `signIn()` before mounting; asserts only the signed-in stub is present.
  - *swaps when the guest signs in* — mounts first, then calls `signIn()` and awaits `nextTick()`; asserts the signed-in stub appears without re-mounting.
- **`beforeEach`** — Resets Pinia to a clean store for each test.

## Relationships

- **`src/modules/cart/views/CartEntry.vue`** — The component under test. `CartEntry.vue` conditionally renders either `Cart.vue` or `GuestCart.vue` based on the session's `isAuth` state; this spec mounts it and asserts the correct branch is taken.

## Notes

- The `signIn()` helper deliberately sets **both** `accessToken` and `viewer`; omitting either one will not flip the `isAuth` computed, so a partial session still renders the guest cart.
- The third test relies on Vue's reactivity (a single `nextTick()` flush) rather than unmounting/remounting, which is the point: `CartEntry.vue` must react to session changes without a full re-render cycle.
- Mock paths are relative to the component (`../views/`, `../components/`), not relative to this spec file—Vitest resolves them against the importer (`CartEntry.vue`).
