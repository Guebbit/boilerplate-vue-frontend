/**
 * @module
 * `composables/idempotent-calls.ts` — the keyed calls' transport rules, on their own: the in-flight
 * 409 is asked again under the SAME key once per delay, any other refusal is rethrown at once, and
 * a merge refusal is final only when the server answered 400, 413 or 422.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkout as apiCheckout } from '@api';
import type { CheckoutRequest } from '@types';
import {
    IDEMPOTENCY_KEY_HEADER,
    isMergeRefusedForGood,
    sendCheckout
} from '../composables/idempotent-calls';
import {
    apiRejection,
    lostAnswer,
    answered
} from '../../../../tests/support/unit/cart-fixtures.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';

vi.mock('@api', () => ({ checkout: vi.fn() }));

/**
 * A body the calls never read; only the key and the retry count matter here.
 */
const BODY = {} as CheckoutRequest;

afterEach(() => {
    vi.resetAllMocks();
});

describe('sendCheckout', () => {
    it('asks again under the same key once per delay while the first attempt is in flight', async () => {
        vi.mocked(apiCheckout)
            .mockRejectedValueOnce(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'))
            .mockRejectedValueOnce(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'))
            .mockResolvedValueOnce(answered(anOrder()));

        await sendCheckout(BODY, 'key-1', [0, 0]);

        expect(apiCheckout).toHaveBeenCalledTimes(3);
        for (const [, config] of vi.mocked(apiCheckout).mock.calls)
            expect(config).toEqual({ headers: { [IDEMPOTENCY_KEY_HEADER]: 'key-1' } });
    });

    it('rethrows once the delays run out', async () => {
        vi.mocked(apiCheckout).mockRejectedValue(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'));

        await expect(sendCheckout(BODY, 'key-1', [0])).rejects.toMatchObject({ status: 409 });
        expect(apiCheckout).toHaveBeenCalledTimes(2);
    });

    it('rethrows any other refusal without asking again', async () => {
        vi.mocked(apiCheckout).mockRejectedValue(apiRejection(422, 'CART_CHANGED'));

        await expect(sendCheckout(BODY, 'key-1', [0, 0])).rejects.toMatchObject({ status: 422 });
        expect(apiCheckout).toHaveBeenCalledTimes(1);
    });
});

describe('isMergeRefusedForGood', () => {
    it.each([400, 413, 422])('is true for an answered %i', (status) => {
        expect(isMergeRefusedForGood(apiRejection(status, 'X'))).toBe(true);
    });

    it.each([409, 500, 503])('is false for an answered %i', (status) => {
        expect(isMergeRefusedForGood(apiRejection(status, 'X'))).toBe(false);
    });

    it('is false for a lost answer', () => {
        expect(isMergeRefusedForGood(lostAnswer())).toBe(false);
    });
});
