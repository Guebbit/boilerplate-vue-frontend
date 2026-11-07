/**
 * @module
 * Forgets the loaded shop between cases. The `shop` barrel does not publish it (no module has a
 * production reason to), so a sibling module's spec reaches it here instead.
 */
export { resetShop } from '@/modules/shop/shop';
