/**
 * Products — public barrel.
 *
 * The only surface a sibling module may import. Everything not re-exported here is internal, and
 * lint enforces that: reaching `@/modules/products/store` from another module is an error, not a
 * shortcut.
 *
 * Keep the surface narrow. Each export here is a promise to every other module that this shape
 * will not move, so add one only when a sibling genuinely needs it.
 */

export { useProductsStore } from './store';
export { productsSchema } from './schemas';
