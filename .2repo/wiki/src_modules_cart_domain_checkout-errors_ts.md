# src/modules/cart/domain/checkout-errors.ts

## Purpose

Pure classifier that maps a raw checkout rejection (the value thrown by `cartStore.checkout()`) into a small, typed verdict the view layer can render from. It intentionally produces no user-facing copy — only structural data (e.g. the shortfall lines) — leaving messaging and side-effects entirely to the view.

## Key elements

- **`CheckoutShortfallLine`** — interface for one under-fulfilled line item (`productId`, `title`, `requested`, `available`) as carried in `CART_INSUFFICIENT_STOCK.details.lines`.
- **`CheckoutErrorVerdict`** — discriminated union with four `kind` values: `'cart-changed'`, `'insufficient-stock'` (carries `lines`), `'address-not-found'`, `'other'`. The `'other'` bucket covers `CART_EMPTY`, `CART_PRODUCT_UNAVAILABLE`, `CART_SHIPPING_METHOD_NOT_FOUND`, and any transport-level failure.
- **`classifyCheckoutError(error: unknown): CheckoutErrorVerdict`** — the sole public entry point. Reads `errors[0]` from the rejection envelope, matches on `code`, and returns the corresponding verdict.
- **`asShortfallLine`** (internal) — runtime guard that narrows an `unknown` entry to `CheckoutShortfallLine`, returning `undefined` on shape mismatch.
- **`firstErrorItem`** (internal) — duck-types `error.errors[0]` without trusting its shape; mirrors the pattern in `infrastructure/utils/errors.ts`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — barrel file for the `cart/domain` package; re-exports the public symbols defined here so consumers can import from the package root.

## Notes

- The file is **pure**: no I/O, no DOM, no logging. It is safe to call in tests without mocking.
- Runtime guards (`asShortfallLine`, `firstErrorItem`) exist because the data crosses a network/wire boundary. Malformed payloads are silently dropped (filtered out of `lines`) or funnelled to the `'other'` verdict rather than throwing.
- The duck-typing style in `firstErrorItem` is deliberately consistent with `infrastructure/utils/errors.ts`; keep them in sync if the envelope shape changes.
- Adding a new error code means adding a new branch in `classifyCheckoutError` *and* a new `kind` in the `CheckoutErrorVerdict` union — the view layer then needs a rendering path for it.
