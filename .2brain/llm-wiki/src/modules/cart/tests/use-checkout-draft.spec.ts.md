---
source: src/modules/cart/tests/use-checkout-draft.spec.ts
sha256: 6413003f31e20bd94a6a89ccd34a45ae525caa29cf4d6747358ff2550e66197c
generated_at: 2026-10-02T15:03:16.825759+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-checkout-draft.spec.ts

## Purpose

Vitest spec for the `use-checkout-draft` composable. It verifies that checkout state (customer note, payment method, chosen address) written to `sessionStorage` survives a page reload, stays isolated per user, and degrades to an empty draft when the stored value is corrupt—so a customer never sees another user's data or a crashed checkout page.

## Key elements

- **`describe('the checkout draft')`** — the single suite; all five `it` blocks live here.
- **`beforeEach`** — calls `sessionStorage.clear()` so each test starts from a clean storage state.
- **"gives back the note, the payment choice and the picked address"** — round-trip: write a full draft for `u1`, read it back, assert deep equality.
- **"is empty for a first visit, and omits what was never chosen"** — asserts the default shape is `{ notes: '' }` and that a partial write (only `notes`) does not fabricate the other fields.
- **"never hands one user's draft to another"** — writes for `u1`, reads `u2`, expects the empty default.
- **"drops every draft at once, for checkout and for logout"** — writes two users' drafts plus an unrelated key, calls `clearCheckoutDrafts()`, asserts both drafts are gone but the unrelated key is preserved.
- **"reads a damaged value as no draft rather than failing the page"** — plants invalid JSON and wrong-typed JSON under the storage key, asserts `readCheckoutDraft` returns the empty default instead of throwing.

## Relationships

- **`@/modules/cart/composables/use-checkout-draft`** (imported) — the unit under test. The spec imports `writeCheckoutDraft`, `readCheckoutDraft`, and `clearCheckoutDrafts` directly.
- **`vitest`** — provides `describe`, `it`, `expect`, `beforeEach`.

## Notes

- Storage key convention is `checkout-draft:{userId}` (visible in the corruption test). Tests must not hard-code other key formats.
- Persistence layer is `sessionStorage`, not `localStorage`—drafts are intentionally tab-session-scoped.
- The composable is expected to swallow parse/type errors silently and return the empty draft; the last test locks in that "fail-open" contract.
- `clearCheckoutDrafts` is scoped to checkout-draft keys only; it must not be a blanket `sessionStorage.clear()`.
