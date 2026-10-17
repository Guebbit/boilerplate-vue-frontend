---
source: src/modules/cart/composables/checkout-attempt-storage.ts
sha256: 3fe12a2fc0d63d91ad0ce68d8a80b3c638b4010ebeb5d08b6d208067d097974d
generated_at: 2026-10-17T00:34:01.050086+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/checkout-attempt-storage.ts

## Purpose

Persists an in-flight checkout attempt in `sessionStorage` so that a page reload mid-checkout replays the same `Idempotency-Key` on retry instead of creating a duplicate order. The attempt dies with the tab, and every access is wrapped in try/catch so a blocked or full storage degrades gracefully to "no stored attempt" without breaking the checkout flow.

## Key elements

- **`CHECKOUT_ATTEMPT_STORAGE_KEY`** – The literal sessionStorage key (`'checkout-attempt'`) used by both read and write.
- **`CheckoutAttempt`** – Interface with three required string fields: `viewerId` (owner scoping), `fingerprint` (order identifier the key is bound to), and `key` (the `Idempotency-Key` header value).
- **`readCheckoutAttempt()`** – Returns the deserialized attempt or `undefined`. Validates shape (all three fields must be strings) after `JSON.parse`; any exception or malformed payload yields `undefined`.
- **`writeCheckoutAttempt(attempt)`** – Serializes and stores the attempt, or removes the entry when called with `undefined`. Silently swallows any `sessionStorage` exception.

## Relationships

- **`src/modules/cart/store.ts`** – The cart store is the sole consumer of this module: it calls `writeCheckoutAttempt` when a checkout is initiated (and again with `undefined` on completion) and calls `readCheckoutAttempt` on mount/retry to recover the key after a reload.

## Notes

- All three fields of `CheckoutAttempt` are plain strings; there is no nested structure.
- `readCheckoutAttempt` performs a manual shape check rather than a full type guard—treat the return as untrusted input.
- The module never throws; both exported functions are side-effect-only (or return a value) and are safe to call from any context, including SSR or environments where `sessionStorage` is absent.
- The `// eslint-disable-next-line no-restricted-syntax` comments on both functions indicate the project's lint config forbids direct `sessionStorage` access outside of this module.
