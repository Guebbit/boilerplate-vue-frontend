/**
 * @module
 * The transport rules of the cart's two keyed calls: the `Idempotency-Key` header, the in-flight
 * retry ladder for checkout, and which merge refusals are final. Stateless: the store decides what
 * the answers do to the cart.
 */
import { checkout as apiCheckout } from '@api';
import type { CheckoutRequest } from '@types';
import { isTransportFailure } from '@/infrastructure/utils/errors';
import { classifyCheckoutError } from '../domain';

/**
 * The header the paired backend's `idempotency` middleware reads off `POST /cart/checkout` — see
 * `IdempotencyKeyHeader` in the contract.
 */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/**
 * How long a checkout waits before asking again, one entry per retry, when the server answers
 * `IDEMPOTENCY_IN_FLIGHT`: the first attempt is still running, so the same key is sent again until
 * it replays the order. A 409 here means "not yet", never "no".
 */
export const IN_FLIGHT_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000];

/**
 * The statuses that say the stored guest list itself is bad (malformed, too many lines, too big):
 * the same request will never succeed, so it is not kept for the next sign-in.
 */
const MERGE_REFUSED_FOR_GOOD: ReadonlySet<number> = new Set([400, 413, 422]);

/**
 * Whether the server refused a merge in a way a retry cannot fix.
 *
 * @param error - What the merge call rejected with.
 * @returns `true` for an answered 400, 413 or 422.
 */
export const isMergeRefusedForGood = (error: unknown): boolean =>
    !isTransportFailure(error) && MERGE_REFUSED_FOR_GOOD.has((error as { status: number }).status);

/**
 * Waits.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 *
 * @param milliseconds - How long to wait.
 * @returns A promise resolving after that long.
 */
const wait = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

/**
 * Sends the checkout under its key, asking again with the SAME key while the server says the
 * first attempt is still running ({@link IN_FLIGHT_RETRY_DELAYS_MS}): the retry then replays the
 * order instead of making a second one.
 *
 * @param checkoutData - The checkout request body.
 * @param key - The `Idempotency-Key` this attempt travels under.
 * @param delays - The waits still left, one per remaining retry.
 * @returns A promise resolving with the API's answer.
 */
export const sendCheckout = (
    checkoutData: CheckoutRequest,
    key: string,
    delays: readonly number[] = IN_FLIGHT_RETRY_DELAYS_MS
): ReturnType<typeof apiCheckout> =>
    // Orval client: the second argument is the request config; the key rides as a header.
    apiCheckout(checkoutData, { headers: { [IDEMPOTENCY_KEY_HEADER]: key } }).catch(
        (error: unknown) => {
            const next = delays.at(0);
            if (next === undefined || classifyCheckoutError(error).kind !== 'in-flight')
                throw error;
            return wait(next).then(() => sendCheckout(checkoutData, key, delays.slice(1)));
        }
    );
