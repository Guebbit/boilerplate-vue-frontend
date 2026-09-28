/**
 * @module
 * One reusable `Idempotency-Key` per user intent (B10/FA53): mint a UUID, keep it across a
 * retryable failure (a transport error or a 5xx — nothing conclusive happened server-side), and
 * mint a fresh one after any definitive answer (success, or a 4xx that means the next attempt is
 * genuinely new). Mirrors the cart store's own `checkoutIdempotencyKey` (B19) — kept as a
 * separate copy there rather than adopted onto this helper, to stay out of the `checkout` lane's
 * files — and `withAntibotToken` (`infrastructure/http/antibot.ts`) for the header-merge shape.
 */
import { ref } from 'vue';
import type { AxiosRequestConfig } from 'axios';
import { isRetryableFailure } from '@/infrastructure/utils/errors.ts';

/** The header the paired backend's `idempotency` middleware reads off a guarded write. */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** One user intent's key, and how to settle it once the call it guards answers. */
export interface IdempotencyKeyKeeper {
    /**
     * Merges the current key into a per-call axios config, alongside anything the caller already
     * set (e.g. an antibot token from `withAntibotToken`).
     *
     * @param options - Per-call axios overrides to merge into.
     * @returns A shallow copy of `options` carrying the header next to whatever it already set.
     */
    withKey: (options?: AxiosRequestConfig) => AxiosRequestConfig;

    /**
     * Settles the attempt this key guarded: keeps it when `error` is retryable, mints a fresh one
     * on success or on a definitive (non-retryable) failure.
     *
     * @param error - The rejected value, when the guarded call failed; omitted on success.
     */
    settle: (error?: unknown) => void;
}

/**
 * Starts a keeper, minted immediately so the very first attempt already has a key.
 *
 * @returns A keeper scoped to the caller — one per distinct user intent (a signup, one payment
 *  step, one contact-form submission). A component or store holds it for as long as retrying the
 *  SAME intent should reuse the SAME key.
 */
export const useIdempotencyKey = (): IdempotencyKeyKeeper => {
    const current = ref(crypto.randomUUID());

    const mint = () => {
        current.value = crypto.randomUUID();
    };

    return {
        withKey: (options) => ({
            ...options,
            // eslint-disable-next-line @typescript-eslint/no-misused-spread -- AxiosHeaders' own enumerable entries are exactly what an object spread copies; orvalMutator merges headers the same way
            headers: { ...options?.headers, [IDEMPOTENCY_KEY_HEADER]: current.value }
        }),
        settle: (error) => {
            if (error === undefined || !isRetryableFailure(error)) mint();
        }
    };
};
