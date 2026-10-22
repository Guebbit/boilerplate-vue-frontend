/**
 * @module
 * Where a guest's cart lives between page loads: this browser's `localStorage`, under one key,
 * as the `{ productId, quantity }` list the domain defines. Nothing about it reaches the server
 * until the visitor signs in and `POST /cart/merge` takes it over. Beside it, under a second key,
 * the merge call still waiting for a conclusive answer, so a retry after a reload is the same call.
 *
 * `localStorage` rather than `sessionStorage`: a guest who closes the tab and comes back tomorrow
 * expects the cart to be there. Every access is guarded, because the storage may be blocked or
 * full, and a cart that cannot be saved still works for as long as the page lives.
 */
import { parseJsonSafe, readJson, writeJson } from '@/infrastructure/utils/safe-storage.ts';
import { BROWSER_STORAGE_NAME } from '@/infrastructure/browser-storage.ts';
import { parseGuestCart, parseMergeAttempt, parseStoredGuestCart } from '../domain';
import type { GuestCartLine, MergeAttempt } from '../domain';

/**
 * The storage key. Also what the `storage` event names when another tab changes the cart.
 */
export const GUEST_CART_STORAGE_KEY = BROWSER_STORAGE_NAME.guestCart;

/**
 * The storage key of the merge attempt still waiting for an answer.
 */
export const GUEST_MERGE_ATTEMPT_STORAGE_KEY = BROWSER_STORAGE_NAME.guestCartMergeAttempt;

/**
 * Reads the merge attempt left unanswered by an earlier call, possibly before a reload.
 *
 * @returns The attempt, or `undefined` when none is saved, it is not an attempt, or storage is
 *  unavailable.
 */
export const readMergeAttempt = (): MergeAttempt | undefined =>
    parseMergeAttempt(readJson('local', GUEST_MERGE_ATTEMPT_STORAGE_KEY));

/**
 * The guest lines an unanswered merge attempt carried.
 *
 * @param attempt - The saved attempt.
 * @returns Its lines, valid ones only; none when the body is not a cart.
 */
export const linesOfMergeAttempt = (attempt: MergeAttempt): GuestCartLine[] =>
    parseGuestCart(parseJsonSafe(attempt.body));

/**
 * Saves the merge attempt in flight, or removes it once the call answered conclusively.
 *
 * @param attempt - The attempt to keep; `undefined` removes the saved one.
 */
export const writeMergeAttempt = (attempt: MergeAttempt | undefined): void => {
    writeJson('local', GUEST_MERGE_ATTEMPT_STORAGE_KEY, attempt);
};

/**
 * Reads the saved guest cart. A cart not changed for thirty days is not returned, and its key is
 * removed.
 *
 * @param now - The current time, epoch milliseconds.
 * @returns The valid lines, or none when nothing is saved, the value is not JSON, it expired, or
 *  storage is unavailable.
 */
export const readGuestCart = (now: number = Date.now()): GuestCartLine[] => {
    const lines = parseStoredGuestCart(readJson('local', GUEST_CART_STORAGE_KEY), now);
    if (lines.length === 0) writeJson('local', GUEST_CART_STORAGE_KEY);
    return lines;
};

/**
 * Saves the guest cart with the time of this change; an empty one removes the key instead of
 * leaving an empty list behind.
 *
 * @param lines - The cart to keep.
 * @param now - The current time, epoch milliseconds.
 */
export const writeGuestCart = (lines: readonly GuestCartLine[], now: number = Date.now()): void => {
    writeJson(
        'local',
        GUEST_CART_STORAGE_KEY,
        lines.length === 0 ? undefined : { savedAt: now, lines }
    );
};
