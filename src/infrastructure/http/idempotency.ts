/**
 * @module
 * One reusable `Idempotency-Key` per user intent: mint a UUID, keep it only while the first attempt
 * may still be running or never arrived (a lost connection, or `409 IDEMPOTENCY_IN_FLIGHT`), and
 * mint a fresh one after any answer, a 5xx included: the API stores every answer and replays it for
 * the same key, so resending a key after a fault would replay the fault. Mirrors the cart store's
 * own `checkoutIdempotencyKey` (a separate copy, not built on this helper) and `withAntibotToken`
 * (`infrastructure/http/antibot.ts`) for the header-merge shape.
 * See: docs/tools/idempotency.md in the backend, "What a failure stores".
 */
import { ref } from 'vue';
import type { AxiosRequestConfig } from 'axios';
import { keepsIdempotencyKey } from '@/infrastructure/utils/errors.ts';

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
     * Settles the attempt this key guarded: keeps it when the attempt may still be running or never
     * arrived (see {@link keepsIdempotencyKey}), mints a fresh one on success and on every answer.
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
            if (error === undefined || !keepsIdempotencyKey(error)) mint();
        }
    };
};

/** One operation's keepers, one per subject it can be asked about. */
export interface IdempotencyKeysBySubject {
    /**
     * The keeper for one subject (an order, a product, a return), made on first use.
     *
     * @param subject - What the call is about: two calls about different subjects never share a key.
     * @returns That subject's keeper.
     */
    forSubject: (subject: string) => IdempotencyKeyKeeper;
}

/**
 * Starts the keepers of one operation that is asked about many subjects (a refund of any order).
 * A single keeper would carry a key kept for order A into a call about order B, which the API
 * refuses as a reused key on a different request.
 *
 * @returns A lookup that hands out one keeper per subject.
 */
export const useIdempotencyKeys = (): IdempotencyKeysBySubject => {
    const keepers = new Map<string, IdempotencyKeyKeeper>();

    return {
        forSubject: (subject) => {
            const keeper = keepers.get(subject) ?? useIdempotencyKey();
            keepers.set(subject, keeper);
            return keeper;
        }
    };
};
