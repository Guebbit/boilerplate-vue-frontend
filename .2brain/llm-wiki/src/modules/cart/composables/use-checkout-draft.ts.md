---
source: src/modules/cart/composables/use-checkout-draft.ts
sha256: 943353b7ca76fa0b04a112f0d59aa208c1bc466d08be86cc2ef4830124f5fd9b
generated_at: 2026-10-02T14:57:01.241877+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-checkout-draft.ts

## Purpose

Persists the checkout-only fields that exist solely in the browser — the customer's free-text order note, selected payment method, and chosen shipping address — into `sessionStorage` keyed per signed-in user. This gives the draft automatic resilience across page reloads and tab crashes, per-user isolation within a shared tab, and automatic expiry when the tab closes, without any server round-trip.

## Key elements

- **`CheckoutDraft`** (interface) — The shape stored in sessionStorage: `notes: string`, `paymentMethodId?: PaymentMethodId`, `addressId?: string`.
- **`readCheckoutDraft(userId)`** — Reads and parses the user's draft from `sessionStorage`. Returns a safe empty draft on missing data, corrupt JSON, or blocked storage.
- **`writeCheckoutDraft(userId, draft)`** — Serializes and saves the draft. Silently swallows storage errors (quota exceeded, blocked storage) since the draft is a convenience.
- **`clearCheckoutDrafts()`** — Iterates all `sessionStorage` keys and removes every one starting with the `checkout-draft:` prefix. Called on successful checkout and at session end.
- **`keyFor(userId)`** (internal) — Builds the storage key as `checkout-draft:<userId>`.
- **`toDraft(value)`** (internal) — Defensive parser: narrows an `unknown` value into a valid `CheckoutDraft`, defaulting missing/mistyped fields to safe values rather than throwing.

## Relationships

- **`src/modules/cart/module.ts`** — Owning module for this composable (it lives under the cart module's `composables/` directory). The module is the cart feature's registration entry point; this composable provides one of its building blocks.

## Notes

- Storage errors are intentionally swallowed everywhere (`try/catch` with no rethrow). The design contract is "losing the draft is the pre-existing, acceptable behaviour" — the customer keeps typing either way.
- `toDraft` deliberately does **not** validate `paymentMethodId` against a known set; the comment notes the API re-checks method ids at order-placement time.
- `notes` is stored **untrimmed**, preserving the customer's exact input.
- `clearCheckoutDrafts` is *not* user-scoped; it removes drafts for all users in the current tab. This is safe because `sessionStorage` is per-tab by nature.
- The delivery/shipping **method** is intentionally excluded — that lives on the server-side cart, not in the browser draft.
