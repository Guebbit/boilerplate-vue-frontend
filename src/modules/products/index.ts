/**
 * @module
 * Products — public barrel: the store, the composable that joins id-only lines (cart,
 * wishlist) to their product records, and the cache invalidation a stock-moving write calls. The only surface a
 * sibling module may import — lint enforces that reaching `@/modules/products/store` directly
 * from another module is an error, not a shortcut.
 *
 * Keep the surface narrow. Each export here is a promise to every other module that this shape
 * will not move, so add one only when a sibling genuinely needs it.
 */

export { useProductsStore, invalidateProductsCache } from './store';
export { useProductLines } from './composables/use-product-lines';
