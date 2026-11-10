---
source: src/modules/cart/guest-cart-storage.ts
sha256: 7689d9ab6973b9da61344434f648f9dca476f88673c29d175997848d885c1c11
signature: 019e8a727dca6a25ed1336359da404df9ffb19685b65e132e36c528d929c7799
generated_at: 2026-11-10T03:58:31.340459+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/guest-cart-storage.ts

## Purpose

Persists a guest's cart (and any in-flight merge attempt) in `localStorage` so the data survives tab closes and page reloads. It is the sole write/read path for the two guest-cart keys and wraps every access in the safe-storage helpers, so a blocked or full storage degrades gracefully rather than throwing.

## Key elements

- **`GUEST_CART_STORAGE_KEY`** / **`GUEST_MERGE_ATTEMPT_STORAGE_KEY`** – The two `localStorage` keys, sourced from `BROWSER_STORAGE_NAME`.
- **`readGuestCart(now?)`** – Reads and parses the stored cart. Applies a 30-day expiry (handled inside `parseStoredGuestCart`); if the result is empty it deletes the key as a side-effect.
- **`writeGuestCart(lines, now?)`** – Writes `{ savedAt, lines }` under the cart key. An empty `lines` array writes `undefined`, effectively removing the key.
- **`readMergeAttempt()`** – Returns the `MergeAttempt` still waiting for a server answer, or `undefined`.
- **`writeMergeAttempt(attempt | undefined)`** – Persists an in-flight merge attempt; passing `undefined` clears the saved one once the call has answered conclusively.
- **`linesOfMergeAttempt(attempt)`** – Extracts the valid `GuestCartLine[]` from a saved attempt's JSON body.

All cart functions accept an optional `now` (epoch ms) defaulting to `Date.now()`, enabling deterministic tests.

## Relationships

- **`src/modules/cart/domain/index.ts`** → **`src/modules/cart/domain/guest-cart.ts`**: Supplies the `GuestCartLine` / `MergeAttempt` types and the three parsers (`parseGuestCart`, `parseMergeAttempt`, `parseStoredGuestCart`) that this module delegates all deserialization and validation to.
- **`src/modules/cart/composables/use-guest-cart.ts`**: The reactive composable that calls these storage functions on mount and on cart mutation, and reads the merge attempt to re-issue a pending merge after a reload.
- **`src/modules/cart/store.ts`**: The Pinia/cart store that `use-guest-cart` wires into; this file is its persistence backend for the unauthenticated path.
- **`src/modules/cart/tests/guest-cart-storage.spec.ts`**: Direct unit tests for every export in this file.
- **`src/modules/cart/tests/guest-cart-input-validation.spec.ts`**, **`src/modules/cart/tests/guest-cart.property.spec.ts`**: Exercise the domain parsers that this module depends on, covering edge-case payloads that would reach `localStorage`.
- **`src/modules/cart/tests/guest-cart-store.spec.ts`**: Integration-level tests that verify the store's read/write cycle through this storage layer.

## Notes

- `readGuestCart` has a **write side-effect**: when the parsed result is empty (expired or malformed), it deletes the key. Callers should not assume it is a pure read.
- The 30-day expiry logic lives in `parseStoredGuestCart` (domain), not here; the `now` parameter is threaded through for testability.
- The merge-attempt pattern is deliberately a "save-then-send" idempotency key: write before the HTTP call, clear after a conclusive (2xx or 4xx) response. A network error or page reload leaves the attempt in storage so the next load can retry the *same* call.
- `localStorage` is chosen over `sessionStorage` intentionally (cross-tab, cross-session persistence for guests). The `storage` event on `GUEST_CART_STORAGE_KEY` is the signal another tab mutated the cart.
