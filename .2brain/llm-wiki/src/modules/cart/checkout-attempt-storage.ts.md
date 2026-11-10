---
source: src/modules/cart/checkout-attempt-storage.ts
sha256: 83069e5f1a268cd4c7c472c21e4bdb10d97b64646ec083664cbd9d25ad12f2d6
signature: 278da903baaa0cb5e1540ed71f05b820106184eba6a64b1f908f6d189f64f051
generated_at: 2026-11-10T03:52:43.874036+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/checkout-attempt-storage.ts

## Purpose

Persists an in-flight checkout attempt in `sessionStorage` so that a page reload mid-checkout replays the same idempotent key instead of minting a new one (and risking a duplicate order). The attempt is scoped to a person and a fingerprint of the order; if either changes, a fresh key is generated. All storage access is defensive—blocked or unavailable storage degrades to a no-op rather than throwing.

## Key elements

- **`CHECKOUT_ATTEMPT_STORAGE_KEY`** – the `sessionStorage` key, sourced from `BROWSER_STORAGE_NAME.checkoutAttempt`.
- **`CheckoutAttempt`** – interface with `viewerId` (owner), `fingerprint` (order identity), and `key` (the idempotency key).
- **`readCheckoutAttempt()`** – reads and shape-validates the stored attempt; returns `undefined` on any mismatch or unavailable storage.
- **`writeCheckoutAttempt(attempt | undefined)`** – persists or removes the attempt via `writeJson('session', …)`.
- **`endCheckoutAttempt()`** – convenience wrapper that clears the stored attempt, signalling the next checkout starts fresh.
- **`checkoutKeyFor(body, cart, viewerId)`** – the primary entry point. Computes a fingerprint via `checkoutFingerprint`, compares it (and the viewer) against the saved attempt; returns the saved key on match, otherwise generates a `crypto.randomUUID()`, saves it, and returns the new key.

## Relationships

- **`src/modules/cart/domain/checkout-attempt.ts`** – provides `checkoutFingerprint`, the pure function that derives the order identity string from the request body and cart lines.
- **`src/modules/cart/domain/index.ts`** – barrel re-export that makes `checkoutFingerprint` available under the `./domain` import specifier used here.
- **`src/modules/cart/store.ts`** – the cart store that calls `checkoutKeyFor` before dispatching a checkout request and `endCheckoutAttempt` once the attempt resolves.

## Notes

- Storage is `sessionStorage`, not `localStorage`: the attempt dies when the tab closes by design.
- `readCheckoutAttempt` performs a manual shape check (all three fields must be strings) rather than relying on `readJson`'s typing; treat the stored value as untrusted.
- A failed `writeCheckoutAttempt` is intentionally non-fatal—the caller still gets a usable key for the lifetime of the page; only a reload loses it.
- `viewerId` is `''` (empty string) for anonymous checkouts; the equality check in `checkoutKeyFor` still works because both sides will be `''`.
