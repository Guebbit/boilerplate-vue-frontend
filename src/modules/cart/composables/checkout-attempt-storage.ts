/**
 * @module
 * Where the checkout attempt in progress is remembered: the `Idempotency-Key` it travels under,
 * the person it belongs to and the fingerprint of the order it was made for. `sessionStorage`, as
 * the checkout draft: a reload in the middle of an unanswered checkout keeps the key, so the retry
 * replays the order on the server instead of placing a second one, and the key dies with the tab.
 * Every access is guarded: storage may be blocked, and an attempt that cannot be saved still works
 * for as long as the page lives.
 */
import { BROWSER_STORAGE_NAME } from '@/infrastructure/browser-storage.ts';
import { readJson, writeJson } from '@/infrastructure/utils/safe-storage.ts';

/**
 * The storage key.
 */
export const CHECKOUT_ATTEMPT_STORAGE_KEY = BROWSER_STORAGE_NAME.checkoutAttempt;

/**
 * A checkout attempt that has not ended yet.
 */
export interface CheckoutAttempt {
    /**
     * The signed-in person it belongs to; another person never inherits it.
     */
    viewerId: string;
    /**
     * What the key is bound to: see `checkoutFingerprint`.
     */
    fingerprint: string;
    /**
     * The `Idempotency-Key` header the attempt carries.
     */
    key: string;
}

/**
 * Reads the saved attempt.
 *
 * @returns The attempt, or `undefined` when none is saved, it is not an attempt, or storage is
 *  unavailable.
 */
export const readCheckoutAttempt = (): CheckoutAttempt | undefined => {
    const parsed = readJson('session', CHECKOUT_ATTEMPT_STORAGE_KEY);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const { viewerId, fingerprint, key } = parsed as Record<string, unknown>;
    return typeof viewerId === 'string' &&
        typeof fingerprint === 'string' &&
        typeof key === 'string'
        ? { viewerId, fingerprint, key }
        : undefined;
};

/**
 * Saves the attempt, or removes it once it ended. A refused write costs only a reload's replay:
 * the retry then mints a new key, as an app with no storage at all would.
 *
 * @param attempt - The attempt to keep; `undefined` removes the saved one.
 */
export const writeCheckoutAttempt = (attempt: CheckoutAttempt | undefined): void => {
    writeJson('session', CHECKOUT_ATTEMPT_STORAGE_KEY, attempt);
};
