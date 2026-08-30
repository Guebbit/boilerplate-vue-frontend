/**
 * @module
 * Products — public barrel: one named export forwarding the module's store. The only surface a
 * sibling module may import — lint enforces that reaching `@/modules/products/store` directly
 * from another module is an error, not a shortcut.
 *
 * Keep the surface narrow. Each export here is a promise to every other module that this shape
 * will not move, so add one only when a sibling genuinely needs it.
 */

export { useProductsStore } from './store';
