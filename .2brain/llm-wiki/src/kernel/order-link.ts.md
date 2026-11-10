---
source: src/kernel/order-link.ts
sha256: 95be0eb140144764653f647a980910b0eedda9fc138e6de50f8650f39a6eeece
signature: 7619cb9c5dd56bcfea7be998ba875cdf0172c9797955653c0e02357a80c2dda2
generated_at: 2026-11-10T03:16:07.941360+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/order-link.ts

## Purpose

Provides two Vue composable factories that return a link-builder for navigating to an order page from a module that is **not** `orders` itself. Because `orders` is a sibling module, the routes may be absent at build time; each factory guards with `linkIfRouted` so callers simply receive `undefined` and render plain text instead of a broken link.

## Key elements

- **`useOrderLink()`** — Returns a function `(orderId?: string | null) => RouteLocationRaw | undefined`. Resolves a single order by ID via the `'OrderTarget'` route name. Returns `undefined` if the ID is missing or the route was not shipped.
- **`useOrderNumberLink()`** — Returns a function `(orderNumber?: string | null) => RouteLocationRaw | undefined`. Resolves the staff orders list filtered to a given number via the `'SalesOrders'` route name (query param `orderNumber`). Returns `undefined` under the same conditions.

Both are intended to be called inside a component's `setup` (they rely on `useRouter`).

## Relationships

- **`src/kernel/registry.ts`** — Supplies the route definitions (`'OrderTarget'`, `'SalesOrders'`) that these factories reference by name through `linkIfRouted`. Without the corresponding registration in the router, both link-builders return `undefined`.

## Notes

- The route names are plain strings, not imported constants; a rename in the router/registry will not produce a compile-time error here.
- `routerLinkI18n` is applied *after* the `linkIfRouted` guard, so locale prefixing only happens on a confirmed route.
- Both functions accept `null` as well as `undefined` for the order identifier — callers passing an empty string will also get `undefined` (falsy check).
