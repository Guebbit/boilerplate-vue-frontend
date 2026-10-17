---
source: src/modules/cart/composables/guest-cart-storage.ts
sha256: c5491c9d281182f87785bfe1535945aac68298aeaf13315586cc90426214fa3f
generated_at: 2026-10-17T00:34:13.408952+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/guest-cart-storage.ts

## Purpose

Persists a guest's cart and any in-flight merge attempt to `localStorage` so they survive tab closures and page reloads. It isolates all `localStorage` access (with guards against blocked or full storage) behind a small read/write API, leaving validation of the stored payloads to the domain layer.

## Key elements

- **`GUEST_CART_STORAGE_KEY`** (`'guest-cart'`) / **`GUEST_MERGE_ATTEMPT_STORAGE_KEY`** (`'guest-cart-merge-attempt'`) — the two `localStorage` keys; also the name used in the `storage` event for cross-tab sync.
- **`readGuestCart()`** — returns the saved cart as validated `GuestCartLine[]`, or `[]`.
- **`writeGuestCart(lines)`** — serialises lines under the cart key; an empty array removes the key instead of storing `[]`.
- **`readMergeAttempt()`** — returns a `MergeAttempt` if one is still waiting for a server answer, or `undefined`.
- **`linesOfMergeAttempt(attempt)`** — extracts the guest lines carried by a saved merge attempt.
- **`writeMergeAttempt(attempt)`** — persists the in-flight attempt; passing `undefined` clears it (i.e. the call has resolved).
- **`parseJson`, `readStoredJson`, `writeStoredJson`** (internal) — helpers that wrap `localStorage` and `JSON.parse` in try/catch so a blocked or full store degrades silently to in-memory-only operation.

## Relationships

- **`../domain`** (re-exported via `domain/index.ts`) — supplies `parseGuestCart`, `parseMergeAttempt`, and the `GuestCartLine` / `MergeAttempt` types. All raw values read from storage are passed through these parsers before being exposed.
- **`use-guest-cart.ts`** — the composable that calls `readGuestCart` / `writeGuestCart` to hydrate and persist cart state, and `readMergeAttempt` / `writeMergeAttempt` to make merge retries idempotent across reloads.
- **`store.ts`** — the cart store layer that coordinates guest-cart state with the composable's storage calls.
- **`tests/guest-cart-storage.spec.ts`** — unit tests covering the read/write functions, including blocked-storage and malformed-JSON paths.
- **`tests/guest-cart-input-validation.spec.ts`**, **`guest-cart-store.spec.ts`**, **`guest-cart.property.spec.ts`** — adjacent test suites that exercise the domain parsers and store integration this file feeds into.

## Notes

- `localStorage` is chosen deliberately over `sessionStorage`: a guest closing the tab and returning tomorrow still expects their cart.
- Every `localStorage` call is wrapped in `try/catch`; on failure the cart simply stays in memory for the life of the page. No error is surfaced to the user.
- `writeGuestCart([])` deletes the key rather than writing `"[]"`, keeping the store clean when the cart is empty.
- `parseJson` returns `unknown`; callers are expected to validate with the domain parsers (`parseGuestCart`, `parseMergeAttempt`) rather than casting.
- The merge-attempt key exists so that a reload during an unanswered `POST /cart/merge` can re-issue the *same* call (same body, same expected effect) rather than starting fresh.
