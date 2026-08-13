/**
 * Wishlist — public barrel.
 *
 * The only surface a sibling module may import. `products` reaches the store for the heart
 * toggle on its own pages — saving a product is done where the product is, not only on the
 * wishlist's own page.
 */

export { useWishlistStore } from './store';
