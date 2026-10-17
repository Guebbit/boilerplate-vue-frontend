---
source: src/modules/cart/tests/use-checkout-draft.spec.ts
sha256: 6bb4a54b19f333a7232eea470298892277e3fd7e9d860b4867471243cd286602
generated_at: 2026-10-17T00:44:50.829096+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-checkout-draft.spec.ts

## Purpose

Unit tests for the checkout-draft persistence layer. They verify that a customer's partial checkout state (delivery note, payment method, selected address) survives a page reload, stays isolated between users on the same tab, and degrades gracefully when the stored value is corrupt—so a bad draft never crashes the checkout page.

## Key elements

- **`beforeEach`** – clears `sessionStorage` before every test to guarantee isolation.
- **Round-trip test** – writes a full draft (`notes`, `paymentMethodId`, `addressId`) via `writeCheckoutDraft` and asserts `readCheckoutDraft` returns the identical object.
- **Default / partial-write test** – asserts an empty read yields `{ notes: '' }`; writing only `notes` leaves other fields absent rather than `null`/`undefined`.
- **User-isolation test** – confirms `u1`'s draft is invisible to `u2`.
- **Bulk-clear test** – writes drafts for two users plus an unrelated key, calls `clearCheckoutDrafts()`, and asserts all drafts are gone while the unrelated key survives.
- **Corruption test** – injects malformed JSON and wrong-typed values directly into `sessionStorage` and asserts `readCheckoutDraft` falls back to `{ notes: '' }` instead of throwing.

## Relationships

- **`src/modules/cart/composables/use-checkout-draft.ts`** – the module under test. Imports and exercises its three public functions: `writeCheckoutDraft`, `readCheckoutDraft`, `clearCheckoutDrafts`.
- **`sessionStorage`** – the composable's backing store; the corruption test writes to it directly (bypassing the composable) to simulate damaged data.

## Notes

- Storage key format is `checkout-draft:{userId}` (visible in the corruption test's direct `sessionStorage.setItem` calls).
- The "empty draft" shape is `{ notes: '' }`, not `{}`—tests treat a missing `paymentMethodId` or `addressId` as "never chosen," not as `null`.
- `clearCheckoutDrafts` is scoped: it removes only draft keys, not arbitrary `sessionStorage` entries (verified by the `something-else` assertion).
- Test runner is **Vitest**; no DOM or mocking setup is needed because the composable is pure `sessionStorage` I/O.
