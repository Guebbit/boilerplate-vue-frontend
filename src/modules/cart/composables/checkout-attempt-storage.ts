/**
 * @module
 * Where the checkout attempt in progress is remembered: the `Idempotency-Key` it travels under,
 * the person it belongs to and the fingerprint of the order it was made for. `sessionStorage`, as
 * the checkout draft: a reload in the middle of an unanswered checkout keeps the key, so the retry
 * replays the order on the server instead of placing a second one, and the key dies with the tab.
 * `checkoutKeyFor` picks the key. Every access is guarded: storage may be blocked, and an attempt that cannot be saved still works
 * for as long as the page lives.
 */
import { BROWSER_STORAGE_NAME } from '@/infrastructure/browser-storage.ts';
import { readJson, writeJson } from '@/infrastructure/utils/safe-storage.ts';
import type { CartResponse, CheckoutRequest } from '@types';
import { checkoutFingerprint } from '../domain';

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

/**
 * Ends the checkout attempt under way: the next checkout is a new call, with a new key.
 */
export const endCheckoutAttempt = (): void => {
    writeCheckoutAttempt(undefined);
};

/**
 * The key of the checkout attempt under way, or a new one when the order is not the one the
 * saved attempt was made for.
 *
 * The key follows a fingerprint of the order (body, cart lines, shipping choice) and the person:
 * the same order asked again is the same call, so the server replays it; anything else is a
 * different call and gets a fresh key. Saved in the tab's storage, so a reload keeps it.
 *
 * @param body - The checkout request body about to be sent, total included.
 * @param cart - The cart the order is made from.
 * @param viewerId - The signed-in person's id, `''` when there is none.
 * @returns The `Idempotency-Key` to send it under.
 */
export const checkoutKeyFor = (
    body: CheckoutRequest,
    cart: CartResponse | undefined,
    viewerId: string
): string => {
    const fingerprint = checkoutFingerprint(body, cart);
    const saved = readCheckoutAttempt();
    if (saved?.viewerId === viewerId && saved.fingerprint === fingerprint) return saved.key;
    const attempt = { viewerId, fingerprint, key: crypto.randomUUID() };
    writeCheckoutAttempt(attempt);
    return attempt.key;
};
