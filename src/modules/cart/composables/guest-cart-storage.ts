/**
 * @module
 * Where a guest's cart lives between page loads: this browser's `localStorage`, under one key,
 * as the `{ productId, quantity }` list the domain defines. Nothing about it reaches the server
 * until the visitor signs in and `POST /cart/merge` takes it over.
 *
 * `localStorage` rather than `sessionStorage`: a guest who closes the tab and comes back tomorrow
 * expects the cart to be there. Every access is guarded, because the storage may be blocked or
 * full, and a cart that cannot be saved still works for as long as the page lives.
 */
import { parseGuestCart } from '../domain';
import type { GuestCartLine } from '../domain';

/**
 * The storage key. Also what the `storage` event names when another tab changes the cart.
 */
export const GUEST_CART_STORAGE_KEY = 'guest-cart';

/**
 * Reads the saved guest cart.
 *
 * @returns The valid lines, or none when nothing is saved, the value is not JSON, or storage is
 *  unavailable.
 */
export const readGuestCart = (): GuestCartLine[] => {
    // eslint-disable-next-line no-restricted-syntax -- localStorage throws when blocked, and JSON.parse when the value is not JSON; either means "no saved cart", never a failure
    try {
        const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        return parseGuestCart(raw === null ? undefined : JSON.parse(raw));
    } catch {
        return [];
    }
};

/**
 * Saves the guest cart; an empty one removes the key instead of leaving `[]` behind.
 *
 * @param lines - The cart to keep.
 */
export const writeGuestCart = (lines: readonly GuestCartLine[]): void => {
    // eslint-disable-next-line no-restricted-syntax -- localStorage throws when blocked or full; the cart is kept in memory either way, so losing the copy costs the next visit, not this one
    try {
        if (lines.length === 0) localStorage.removeItem(GUEST_CART_STORAGE_KEY);
        else localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
        // Nothing to report to: the visitor keeps shopping either way.
    }
};
