---
source: src/modules/cart/domain/guest-cart.ts
sha256: 870a30d0081f9c5c925dd80d78625a8b379eb9c900c141b11cfffeb9cbf00d6d
generated_at: 2026-10-17T00:35:52.041102+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/guest-cart.ts

## Purpose

Pure domain logic for a signed-out visitor's cart: the `GuestCartLine` type, the quantity/line-count caps that mirror the `POST /cart/merge` contract, and a set of stateless functions to add, set, remove, and reconcile cart lines. No storage, no framework imports — it loads with the app shell and keeps the merge invariants (per-line cap, line-count cap, id format) in one place.

## Key elements

- **`GuestCartLine`** — `{ productId: string; quantity: number }`; one row of a guest cart.
- **`MAX_GUEST_LINE_QUANTITY`** (999) / **`MAX_GUEST_LINES`** (100) — the contract caps for a single merged line and lines per merge call.
- **`addGuestLine(lines, productId, quantity)`** — grows an existing line or appends a new one; caps at 999; refuses a new product once 100 lines exist (returns `undefined`).
- **`setGuestLineQuantity(lines, productId, quantity)`** — overwrites a line's quantity; truncates, clamps to `[1, 999]`; ignores `NaN` and unknown products.
- **`removeGuestLines(lines, productIds)`** — filters out the listed products.
- **`subtractGuestLines(lines, sent)`** — after a merge call, removes the quantities that were already sent, leaving only what changed in flight.
- **`guestCartQuantity(lines)`** — sums all quantities (for the app-bar badge).
- **`parseGuestCart(stored)`** — reads an untrusted storage value into a valid `GuestCartLine[]`; drops malformed lines, deduplicates, enforces caps.
- **`MergeAttempt`** / **`parseMergeAttempt(stored)`** — the `{ key, body }` pair identifying an in-flight idempotent merge; parsed defensively from storage.
- **`asGuestLine`** (private) — single-line shape check (id regex `^[\w-]{1,64}$`, integer quantity 1–999); used by `parseGuestCart`.

## Relationships

- **`domain/index.ts`** — barrel re-exports the public symbols of this module so other cart files can import from the domain namespace.
- **`composables/use-guest-cart.ts`** — calls `addGuestLine`, `setGuestLineQuantity`, `removeGuestLines`, `subtractGuestLines`, `guestCartQuantity`, and `parseMergeAttempt` to drive guest-cart state.
- **`composables/guest-cart-storage.ts`** — persists/restores the cart and merge attempt; calls `parseGuestCart` on read and serialises `MergeAttempt` on write.
- **`components/GuestCart.vue`** — renders the guest cart UI; consumes the composable that wraps this module.
- **`store.ts`** — the authenticated cart store; its merge logic mirrors the caps and grow-by-quantity rule defined here.
- **`tests/guest-cart.spec.ts`**, **`tests/guest-cart-input-validation.spec.ts`**, **`tests/guest-cart.property.spec.ts`** — unit, validation, and property-based tests covering every exported function.

## Notes

- **No schema library by design.** `asGuestLine` is hand-written because this file loads with the app shell; pulling in Zod/Valibot would bloat the initial bundle.
- **`addGuestLine` returns `undefined`** (not an empty array) when the cart is full of other products — callers must handle the `undefined` case (`?? lines`).
- **`setGuestLineQuantity` does not add a new line.** If the product has no line, the cart is returned unchanged.
- **`subtractGuestLines` is for post-merge reconciliation only** (e.g., a second tab's additions while a merge was in flight); it is not a general "subtract" helper.
- **`parseGuestCart` deduplicates via `addGuestLine`**, so storing the same product twice folds into one line rather than violating `MAX_GUEST_LINES`.
