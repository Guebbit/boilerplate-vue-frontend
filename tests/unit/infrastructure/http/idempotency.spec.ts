/**
 * @module
 * Unit tests for `useIdempotencyKey`: the header it attaches, and when a key is kept
 * across a retry versus minted fresh — the whole point of the helper, since a wrong answer here
 * means either a duplicate charge/signup/send (kept too long) or a retry the server rejects as a
 * reused key on a different body (minted too eagerly).
 */
import { describe, expect, it } from 'vitest';
import type { AxiosRequestConfig } from 'axios';
import {
    IDEMPOTENCY_KEY_HEADER,
    useIdempotencyKey,
    useIdempotencyKeys
} from '@/infrastructure/http/idempotency.ts';

/**
 * Reads the header `withKey` attaches. `headers` is typed optional on `AxiosRequestConfig` in
 * general, but `withKey` always sets it — the `!` narrows what the compiler cannot.
 */
const keyOf = (config: AxiosRequestConfig): string =>
    config.headers![IDEMPOTENCY_KEY_HEADER] as string;

/** A transport failure: no answer arrived, so the first attempt may still be running. */
const TRANSPORT_FAILURE = { status: 0 };

/** A provider 5xx — an answer the API stores and replays for the same key. */
const SERVER_FAILURE = { status: 503 };

/** The API's own "the first attempt is still running" refusal. */
const IN_FLIGHT = { status: 409, errors: [{ code: 'IDEMPOTENCY_IN_FLIGHT' }] };

/** A definitive 4xx refusal — "email taken", a decline, a validation error. */
const CLIENT_FAILURE = { status: 422 };

/** A stand-in for a real per-call option, e.g. the one `signup` attaches. */
const onUploadProgress = () => {};

describe('useIdempotencyKey', () => {
    it('mints a key immediately, before any call is made', () => {
        const keeper = useIdempotencyKey();
        expect(keeper.withKey().headers).toHaveProperty(IDEMPOTENCY_KEY_HEADER);
    });

    it('keeps the caller’s other per-call options alongside the header', () => {
        const keeper = useIdempotencyKey();
        const result = keeper.withKey({ onUploadProgress, headers: { 'X-Custom': '1' } });

        expect(result.onUploadProgress).toBe(onUploadProgress);
        expect(result.headers).toMatchObject({ 'X-Custom': '1' });
        expect(result.headers).toHaveProperty(IDEMPOTENCY_KEY_HEADER);
    });

    it('sends the SAME key on the next call after a transport failure', () => {
        const keeper = useIdempotencyKey();
        const firstKey = keyOf(keeper.withKey());

        keeper.settle(TRANSPORT_FAILURE);

        expect(keyOf(keeper.withKey())).toBe(firstKey);
    });

    it('sends the SAME key on the next call after the API said the first is in flight', () => {
        const keeper = useIdempotencyKey();
        const firstKey = keyOf(keeper.withKey());

        keeper.settle(IN_FLIGHT);

        expect(keyOf(keeper.withKey())).toBe(firstKey);
    });

    it('mints a FRESH key after a 5xx, which the API would replay for the old one', () => {
        const keeper = useIdempotencyKey();
        const firstKey = keyOf(keeper.withKey());

        keeper.settle(SERVER_FAILURE);

        expect(keyOf(keeper.withKey())).not.toBe(firstKey);
    });

    it('mints a FRESH key after a success', () => {
        const keeper = useIdempotencyKey();
        const firstKey = keyOf(keeper.withKey());

        keeper.settle();

        expect(keyOf(keeper.withKey())).not.toBe(firstKey);
    });

    it('mints a FRESH key after a definitive 4xx refusal', () => {
        const keeper = useIdempotencyKey();
        const firstKey = keyOf(keeper.withKey());

        keeper.settle(CLIENT_FAILURE);

        expect(keyOf(keeper.withKey())).not.toBe(firstKey);
    });
});

describe('useIdempotencyKeys', () => {
    it('hands the same keeper back for the same subject', () => {
        const keys = useIdempotencyKeys();

        expect(keys.forSubject('order-1')).toBe(keys.forSubject('order-1'));
    });

    it('keeps one subject’s key apart from another’s', () => {
        const keys = useIdempotencyKeys();
        const first = keyOf(keys.forSubject('order-1').withKey());

        keys.forSubject('order-1').settle(TRANSPORT_FAILURE);

        expect(keyOf(keys.forSubject('order-1').withKey())).toBe(first);
        expect(keyOf(keys.forSubject('order-2').withKey())).not.toBe(first);
    });
});
