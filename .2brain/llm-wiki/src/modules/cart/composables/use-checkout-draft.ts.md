---
source: src/modules/cart/composables/use-checkout-draft.ts
sha256: 82724e06d9f80b552b72fdfd20b428b82850182ab0e8ad72cc3d1c16d78307e5
signature: 91da5455a7c3964eda5d458fb6e6ca408e91e2d4f4a938cfa4f113732ddab4ae
generated_at: 2026-11-10T03:55:15.147515+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-checkout-draft.ts

## Purpose

Persists the browser-only parts of a checkout form — the free-text order note, the chosen payment method, and the chosen address id — in `sessionStorage`, scoped per signed-in user. This lets a page reload or crashed tab restore what the customer already typed, while the data still dies with the tab. The delivery method is intentionally excluded (the server-side cart owns it).

## Key elements

- **`CheckoutDraft`** (interface) — the shape persisted: `notes: string`, optional `paymentMethodId: PaymentMethodId`, optional `addressId: string`.
- **`readCheckoutDraft(userId)`** — exported. Returns the user's saved draft, or a default-empty `{ notes: '' }` when nothing is stored or storage is unavailable.
- **`writeCheckoutDraft(userId, draft)`** — exported. Saves the draft. A refused write is treated as non-fatal.
- **`clearCheckoutDrafts()`** — exported. Removes *all* draft entries (every user) by prefix; called on checkout completion and on session end.
- **`toDraft`** (internal) — Defensive sanitizer: coerces an unknown parsed value into a valid `CheckoutDraft`, dropping fields with the wrong type.
- **`keyFor`** (internal) — Builds the per-user storage key from `BROWSER_STORAGE_NAME.checkoutDraft` + userId.

## Relationships

- **`SignedInCart.vue`** — Consumes `readCheckoutDraft` / `writeCheckoutDraft` to populate and save the checkout form fields the customer is actively editing.
- **`module.ts`** — The cart module lifecycle; expected to call `clearCheckoutDrafts` when the session ends.
- **`use-checkout-draft.spec.ts`** — Unit tests for the read / write / clear / sanitize behavior of this module.
- **`cart-view.spec.ts`**, **`module-badge.spec.ts`** — Cart-level integration tests that exercise the checkout-draft path indirectly.

## Notes

- Storage medium is **`sessionStorage`**, not `localStorage`. Data is gone the moment the tab closes — by design.
- Keys are namespaced per user id, so a second signed-in user on the same tab cannot read the first user's draft.
- `toDraft` does **not** validate `paymentMethodId` against a known set; the cast is deferred to order-placement time.
- `notes` is stored exactly as typed (untrimmed); any trimming is the consumer's concern.
- `clearCheckoutDrafts` is **global** (all users), not per-user. There is no `clearCheckoutDraft(userId)`.
- All reads/writes go through `safe-storage.ts` helpers, so exceptions from a restricted or full storage context are swallowed rather than thrown.
