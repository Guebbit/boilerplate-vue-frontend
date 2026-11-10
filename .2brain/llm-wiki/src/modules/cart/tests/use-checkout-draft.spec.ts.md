---
source: src/modules/cart/tests/use-checkout-draft.spec.ts
sha256: 6bb4a54b19f333a7232eea470298892277e3fd7e9d860b4867471243cd286602
signature: 6bb4a54b19f333a7232eea470298892277e3fd7e9d860b4867471243cd286602
generated_at: 2026-11-10T04:13:19.653904+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-checkout-draft.spec.ts

## Purpose

Vitest spec that pins down the persistence contract of the checkout draft composable. Each test mirrors a real customer failure: a note disappearing after reload, an address reverting, one user's draft leaking to the next, or a corrupt storage value crashing the checkout page.

## Key elements

- **`describe('the checkout draft')`** — single suite containing all five cases.
- **`beforeEach` → `sessionStorage.clear()`** — guarantees an isolated store before every test.
- **Test: round-trip** — writes `{ notes, paymentMethodId, addressId }` for user `u1` and asserts `readCheckoutDraft` returns the identical object.
- **Test: empty / partial state** — confirms a first read yields `{ notes: '' }` and that only explicitly-set fields appear after a partial write.
- **Test: user isolation** — writes for `u1`, asserts `u2` sees an empty draft.
- **Test: bulk clear** — calls `clearCheckoutDrafts()` after seeding two users; verifies both are gone while an unrelated `sessionStorage` key survives.
- **Test: corrupt data** — injects malformed JSON and wrong-typed values directly into the `checkout-draft:u1` key; asserts the reader returns `{ notes: '' }` rather than throwing.

## Relationships

- **`src/modules/cart/composables/use-checkout-draft.ts`** — the sole production dependency. This spec imports and exercises its three exports: `writeCheckoutDraft`, `readCheckoutDraft`, and `clearCheckoutDrafts`.
- **`sessionStorage` (Web API)** — the backing store the composable uses; the spec clears it between tests and writes corrupt values directly into it to simulate edge cases.
- **Vitest** — provides `describe`, `it`, `beforeEach`, `expect`.

## Notes

- The storage key format is `checkout-draft:{userId}` (visible in the corrupt-data test). The composable is expected to namespace per user.
- `clearCheckoutDrafts()` is **selective**: it must remove only checkout-draft keys, not arbitrary `sessionStorage` entries (asserted explicitly in the bulk-clear test).
- The "empty draft" contract is the object `{ notes: '' }` — not `null`, not `{}`, not `undefined`. Any code reading the draft should expect this shape.
- The corrupt-data test covers **two** failure modes: invalid JSON (`'{not json'`) and valid JSON with wrong types (`notes: 5`). Both must degrade to the empty draft, never throw.
