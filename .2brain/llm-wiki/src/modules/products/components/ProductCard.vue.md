---
source: src/modules/products/components/ProductCard.vue
sha256: 117ded5cdc72519ddda4dcc15de88c7fd9fdd8e5c8c090f58f10fa5f02fc639f
generated_at: 2026-10-17T01:27:02.431662+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/components/ProductCard.vue

## Purpose

Renders a single product in the shopper-facing catalogue grid: image, title (as a link to the product page), price, a shelf-state badge, and a slot for action buttons contributed by other modules. It is intentionally free of staff controls (edit/delete), which belong to a separate table view.

## Key elements

- **`product` prop** — the single `Product` to display.
- **`isAuth`** (from `useSessionStore`) — when false, a "sign in to buy" prompt is shown in the action row.
- **`productActions`** — resolved via `useSlot('product-actions')`; other modules register button components here and this card renders them without knowing their identity.
- **`SHELF_LABELS`** — maps each `ShelfState` to a literal i18n key (keeps all keys greppable for translation checks).
- **`SHELF_COLORS`** — maps each `ShelfState` to a chip colour; uses `satisfies Record<ShelfState, string>` so a new state added to the domain type will break the build if no colour is provided.
- **`shelf`** (computed) — calls `shelfStateOf(product)` to resolve the display state; off-sale outranks preorder, which outranks in/out-of-stock.
- **Template** — `<article>` with `LazyImage` (decorative, `alt=""`), a `RouterLink`-wrapped `<h3>` for the title, a formatted price, a `v-chip` badge, and the dynamic action/login row.

## Relationships

- **`src/modules/products/domain/index.ts`** — source of `shelfStateOf` and the `ShelfState` type used by this card's badge logic.
- **`src/modules/products/domain/shelf-state.ts`** — defines the `ShelfState` union and `shelfStateOf` priority resolution that the card depends on.
- **`src/modules/products/views/ProductsList.vue`** — the grid view that renders multiple `ProductCard` instances.
- **`src/modules/products/tests/product-card.spec.ts`** — unit/component tests targeting this card's rendering and interactions.

## Notes

- The product image is explicitly decorative (`alt=""`); the accessible name comes from the `<h3>` title link, so screen readers get one clean name.
- The `product-actions` slot is shared with the product page (per the module doc comment), meaning the same set of action components can appear in both places without duplication.
- `SHELF_COLORS` deliberately uses `satisfies` rather than an annotation: it preserves the literal keys for template usage while still enforcing exhaustiveness against the `ShelfState` type.
- Action buttons are rendered unconditionally via `v-for`; the login prompt (`v-if="!isAuth"`) appears alongside them. Whether the slot actually yields components for guests depends on the contributing modules, not on this card.
