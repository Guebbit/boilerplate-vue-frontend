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
import { parseGuestCart, parseMergeAttempt } from '../domain';
import type { GuestCartLine, MergeAttempt } from '../domain';

/**
 * The storage key. Also what the `storage` event names when another tab changes the cart.
 */
export const GUEST_CART_STORAGE_KEY = 'guest-cart';

/**
 * The storage key of the merge attempt still waiting for an answer.
 */
export const GUEST_MERGE_ATTEMPT_STORAGE_KEY = 'guest-cart-merge-attempt';

/**
 * Parses JSON text.
 *
 * @param raw - The text.
 * @returns The parsed value, or `undefined` when it is not JSON.
 */
const parseJson = (raw: string): unknown => {
    // eslint-disable-next-line no-restricted-syntax -- JSON.parse has no non-throwing form; text that is not JSON means "nothing usable", never a failure
    try {
        // `JSON.parse` returns `any`; callers treat the value as `unknown` and validate it.
        return JSON.parse(raw) as unknown;
    } catch {
        return undefined;
    }
};

/**
 * Reads one key and parses it as JSON.
 *
 * @param key - The storage key.
 * @returns The parsed value, or `undefined` when nothing is saved, the value is not JSON, or
 *  storage is unavailable.
 */
const readStoredJson = (key: string): unknown => {
    // eslint-disable-next-line no-restricted-syntax -- localStorage throws when blocked; that means "nothing saved", never a failure
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? undefined : parseJson(raw);
    } catch {
        return undefined;
    }
};

/**
 * Saves a value under a key as JSON, or removes the key when there is no value.
 *
 * @param key - The storage key.
 * @param value - What to keep; `undefined` removes the key.
 */
const writeStoredJson = (key: string, value?: unknown): void => {
    // eslint-disable-next-line no-restricted-syntax -- localStorage throws when blocked or full; the data is kept in memory either way, so losing the copy costs the next visit, not this one
    try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Nothing to report to: the visitor keeps shopping either way.
    }
};

/**
 * Reads the merge attempt left unanswered by an earlier call, possibly before a reload.
 *
 * @returns The attempt, or `undefined` when none is saved, it is not an attempt, or storage is
 *  unavailable.
 */
export const readMergeAttempt = (): MergeAttempt | undefined =>
    parseMergeAttempt(readStoredJson(GUEST_MERGE_ATTEMPT_STORAGE_KEY));

/**
 * The guest lines an unanswered merge attempt carried.
 *
 * @param attempt - The saved attempt.
 * @returns Its lines, valid ones only; none when the body is not a cart.
 */
export const linesOfMergeAttempt = (attempt: MergeAttempt): GuestCartLine[] =>
    parseGuestCart(parseJson(attempt.body));

/**
 * Saves the merge attempt in flight, or removes it once the call answered conclusively.
 *
 * @param attempt - The attempt to keep; `undefined` removes the saved one.
 */
export const writeMergeAttempt = (attempt: MergeAttempt | undefined): void => {
    writeStoredJson(GUEST_MERGE_ATTEMPT_STORAGE_KEY, attempt);
};

/**
 * Reads the saved guest cart.
 *
 * @returns The valid lines, or none when nothing is saved, the value is not JSON, or storage is
 *  unavailable.
 */
export const readGuestCart = (): GuestCartLine[] =>
    parseGuestCart(readStoredJson(GUEST_CART_STORAGE_KEY));

/**
 * Saves the guest cart; an empty one removes the key instead of leaving `[]` behind.
 *
 * @param lines - The cart to keep.
 */
export const writeGuestCart = (lines: readonly GuestCartLine[]): void => {
    writeStoredJson(GUEST_CART_STORAGE_KEY, lines.length === 0 ? undefined : lines);
};
