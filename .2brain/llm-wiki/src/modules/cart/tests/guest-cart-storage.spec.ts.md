---
source: src/modules/cart/tests/guest-cart-storage.spec.ts
sha256: 7dac7317943b61308789ea0d016eb6e31d14b73c8eeb90fe6463005a22a3697b
generated_at: 2026-10-17T00:40:16.871053+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-storage.spec.ts

## Purpose

Vitest spec for the `guest-cart-storage` composable. It pins down three contracts: round-trip fidelity of guest cart lines and merge-attempt data in `localStorage`, graceful degradation when stored values are corrupt or non-conforming, and the guarantee that browser storage failures (blocked, quota-exceeded) never surface as exceptions to the visitor.

## Key elements

- **`describe('readGuestCart')`** — Verifies round-trip with `writeGuestCart`, empty-cart default, rejection of non-JSON, filtering of partially-valid arrays (keeps only lines with both `productId` and `quantity`), and silent `[]` on a `SecurityError` from `getItem`.
- **`describe('writeGuestCart')`** — Confirms data lands under `GUEST_CART_STORAGE_KEY`, that passing `[]` **removes the key** (not stores `'[]'`), and that `QuotaExceededError` on `setItem` / `SecurityError` on `removeItem` are swallowed.
- **`describe('the pending merge attempt')`** — Round-trips `{ key, body }` via `writeMergeAttempt` / `readMergeAttempt`; clearing with `undefined` removes the key. An `it.each` block asserts that any stored value failing shape checks (non-JSON, non-object, missing `body`, non-string `key`) reads back as `undefined`. A final test mocks all three storage methods to throw and asserts no exception escapes.
- **`describe('a saved guest cart that is not a list')`** — `it.each` over `'null'`, a number, a string, and a single object; each must read as `[]`, not throw.
- **`beforeEach` / `afterEach`** — `localStorage.clear()` before every test; `vi.restoreAllMocks()` after, so the Storage-prototype spies don't leak.

## Relationships

- **`src/modules/cart/composables/guest-cart-storage.ts`** — Sole import target. The spec exercises every export: the two storage-key constants (`GUEST_CART_STORAGE_KEY`, `GUEST_MERGE_ATTEMPT_STORAGE_KEY`) and the four functions (`readGuestCart`, `writeGuestCart`, `readMergeAttempt`, `writeMergeAttempt`).

## Notes

- The "keeps the valid lines of a value somebody edited" test documents that `readGuestCart` **filters** bad entries from an otherwise-valid array rather than rejecting the whole value. New validation logic in the composable should be reflected here.
- `writeGuestCart([])` is a *delete*, not a write of `'[]'`. Any change to that behavior breaks the "removes the key" assertion.
- All storage-failure tests spy on `Storage.prototype` methods, not on the composable's internals—so they catch regressions even if the composable refactors how it calls the storage API.
