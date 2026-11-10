---
source: src/modules/cart/domain/guest-cart.ts
sha256: 2c9519f2e4f6c0c580725fbaff1e6407a469887a479cab92f5ac47f6867efb34
signature: b2ca21dac21c2c18cdc0df0156e0b62b94e9d2ec641ac2e3bd4aac9395a0ac7d
generated_at: 2026-11-10T03:57:31.091963+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/guest-cart.ts

## Purpose

Pure domain logic for a signed-out visitor's cart: a list of `{ productId, quantity }` lines with no storage, no store, and no side effects. All caps mirror the `POST /cart/merge` API contract so a fully-built guest cart can always be sent in a single call.

## Key elements

- **`GuestCartLine`** — interface for one cart line (`productId: string`, `quantity: number`).
- **`MAX_GUEST_LINE_QUANTITY` (999) / `MAX_GUEST_LINES` (100)** — per-line and per-cart caps, hardcoded as literals (see Notes).
- **`addGuestLine(lines, productId, quantity)`** — adds or grows a line; returns `undefined` when the cart is at the product-count cap and the product is new.
- **`setGuestLineQuantity(lines, productId, quantity)`** — sets an exact quantity on an existing line (truncates, clamps 1–999); ignores `NaN`.
- **`removeGuestLines(lines, productIds)`** — filters out lines for the given products.
- **`subtractGuestLines(lines, sent)`** — subtracts quantities already carried by an in-flight merge call, dropping zero-remainder lines.
- **`guestCartQuantity(lines)`** — sums all quantities (app-bar badge).
- **`parseGuestCart(stored)`** — validates a raw array into valid lines, folding duplicates and enforcing caps.
- **`GUEST_CART_MAX_AGE_MS`** — 30-day TTL for a stored cart.
- **`parseStoredGuestCart(stored, now)`** — reads the `{ savedAt, lines }` envelope, enforces the TTL, then delegates to `parseGuestCart`.
- **`MergeAttempt`** — interface pairing an `Idempotency-Key` with the serialised request body it bound.
- **`parseMergeAttempt(stored)`** — validates a stored value as a `MergeAttempt`.
- **`asGuestLine`** (internal) — type-guards a single unknown value into a `GuestCartLine`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — barrel file that re-exports this module's public API.
- **`src/modules/cart/guest-cart-storage.ts`** — owns the actual `localStorage` read/write; this file is the pure logic layer it delegates shape-validation to via `parseGuestCart` / `parseStoredGuestCart`.
- **`src/modules/cart/composables/use-guest-cart.ts`** — composable that wires storage to the domain functions exposed here.
- **`src/modules/cart/store.ts`** — app store that consumes the same domain operations.
- **`src/modules/cart/components/GuestCart.vue`** — presentational component driven by the composable/store that call into these functions.
- **`src/modules/cart/tests/guest-cart.spec.ts`** — unit tests; also asserts `MAX_GUEST_LINE_QUANTITY` equals the generated contract constant.
- **`src/modules/cart/tests/guest-cart-input-validation.spec.ts`** — exercises the validation paths in `asGuestLine` / `parseGuestCart`.
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** — property-based tests for the add/set/subtract invariants.

## Notes

- **Constants are deliberate literals.** `MAX_GUEST_LINE_QUANTITY` and `MAX_GUEST_LINES` are not imported from `@api/schemas` because this file ships in the entry chunk and that module loads lazily. `guest-cart.spec.ts` pins them to the generated values so they cannot drift silently.
- **`asGuestLine` is hand-written** rather than generated from a schema, for the same entry-chunk reason: a schema library would be pulled into the initial bundle.
- **`parseStoredGuestCart` expects an envelope** (`{ savedAt, lines }`), not a bare array. A bare array (e.g. from an older build) reads as empty.
- **`subtractGuestLines` is idempotency-aware:** it exists so that quantities already committed by a merge call (tracked via `MergeAttempt`) are not double-counted when the guest edited the cart while the request was in flight.
- **All mutators return new arrays** (immutability); the input `readonly GuestCartLine[]` is never modified.
