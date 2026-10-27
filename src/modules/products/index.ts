/**
 * @module
 * Products — public barrel: narrow handles on the products store, never the store itself. The
 * composable that joins id-only lines (cart, wishlist) to their product records, the shelf-state
 * rank, and the cache drop a stock-moving write calls. The only surface a sibling module may
 * import — lint enforces that reaching `./store` directly from another module is an error, not a
 * shortcut.
 *
 * Keep the surface narrow. Each export here is a promise to every other module that this shape
 * will not move, so add one only when a sibling genuinely needs it. Specs reach the store through
 * `src/modules/products/tests/products-store.ts`.
 */

export { invalidateProductsCache } from './store';
export { useProductLines } from './composables/use-product-lines';
export { shelfStateOf } from './domain';
