---
source: src/modules/products/components/ProductCard.vue
sha256: 3cf972e8353beefc416f77f3919cc93da19ebbf21bc93f376e9328dba25120b9
signature: f92e317e18d28ae32c31d7d128a09d3118dc4fa6414627b46157b0769fa58887
generated_at: 2026-11-10T05:19:12.080817+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/components/ProductCard.vue

## Purpose

Renders a single product as a shopper sees it in the catalogue grid: image, title (as an accessible link to the product page), price, availability badge, and the `product-actions` slot. It is the card-level presentational unit that `ProductsList` composes into a grid; it intentionally excludes staff-only controls (edit/delete), which live in a separate table component.

## Key elements

- **`product` prop** — the single `Product` object the card displays.
- **`SHELF_LABELS` / `SHELF_COLORS`** — local constant maps from `ShelfState` to an i18n key and a `ThemeColor` respectively. `SHELF_COLORS` uses `satisfies Record<ShelfState, ThemeColor>` so that adding a new shelf state without a colour entry is a compile-time error.
- **`shelf` (computed)** — delegates to `shelfStateOf(product)` from the domain module to resolve the current shelf state (off-sale outranks preorder outranks stock).
- **`shelfText` (computed)** — produces the human-readable badge text. Special-cases backorder without a `restockDate` to show a generic "within N days" promise (value comes from `backorderPromiseDays` in `@/modules/shop`).
- **`productActions` (slot)** — obtained via `useSlot('product-actions')`; the card renders whatever components other modules register into that slot without knowing their identity.
- **Auth guard** — `isAuth` from the session store; when the visitor is a guest, the action slot is hidden and a "sign in to buy" hint is shown instead.
- **`LazyImage`** — decorative product image (`alt=""`); the title link below carries the accessible name.
- **`routerLinkI18n`** — builds a localised route to the `ProductTarget` page using the product id.

## Relationships

- **`src/modules/products/domain/shelf-state.ts`** — defines `shelfStateOf` and the `ShelfState` union type that drive the badge logic and the `satisfies` constraint on `SHELF_COLORS`.
- **`src/modules/products/views/ProductsList.vue`** — parent view that instantiates this card in a grid; the card is a leaf presentational unit with no child routes of its own.
- **`src/modules/products/tests/product-card.spec.ts`** — unit-test spec that exercises the card's badge text, auth-gating, and slot rendering (targets the `data-test` attributes present in the template).

## Notes

- The image is deliberately `alt=""` (decorative). The `<RouterLink>` wrapping the title is the sole accessible name for the card, so screen-reader users hear the product title, not a redundant image description.
- `SHELF_COLORS` uses `satisfies` rather than a type annotation: this preserves the literal colour values for the template while still enforcing exhaustiveness over `ShelfState`. Adding a new shelf state in the domain without a matching entry here will fail the type check.
- The backorder-without-date branch references `backorderPromiseDays` from `@/modules/shop`, an external module. That value is reactive (a ref), so the badge text updates if the promise window changes at runtime.
- The card does not own any mutation logic. All actions (add-to-cart, save, etc.) are injected via the `product-actions` slot, keeping the card agnostic of who contributes.
