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
    // eslint-disable-next-line no-restricted-syntax -- sessionStorage throws when blocked, and JSON.parse when the value is not JSON; either means "no saved attempt", never a failure
    try {
        const raw = sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
        const parsed: unknown = raw === null ? undefined : JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return undefined;
        const { viewerId, fingerprint, key } = parsed as Record<string, unknown>;
        return typeof viewerId === 'string' &&
            typeof fingerprint === 'string' &&
            typeof key === 'string'
            ? { viewerId, fingerprint, key }
            : undefined;
    } catch {
        return undefined;
    }
};

/**
 * Saves the attempt, or removes it once it ended.
 *
 * @param attempt - The attempt to keep; `undefined` removes the saved one.
 */
export const writeCheckoutAttempt = (attempt: CheckoutAttempt | undefined): void => {
    // eslint-disable-next-line no-restricted-syntax -- sessionStorage throws when blocked or full; without the copy a retry after a reload mints a new key, which is the state of an app with no storage at all
    try {
        if (attempt) sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
        else sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
    } catch {
        // Nothing to report to: the checkout itself still works.
    }
};
