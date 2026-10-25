/**
 * @module
 * Unit tests for the problem-details readers — the `{ errors }` list. Each
 * case names the response shape it stands for, rather than an invented one that happens to pass.
 */
import { describe, expect, it } from 'vitest';
import { getFirstApiError, getRetryAfter } from '@/infrastructure/http/envelope.ts';
import { aProblem } from '../../../support/unit/fixtures.ts';

describe('getFirstApiError', () => {
    it('reads the first structured error off a reject envelope', () => {
        // What `onResponseReject` builds, and what `step-up.ts` reads `REAUTH_REQUIRED` from.
        expect(getFirstApiError({ errors: [{ code: 'REAUTH_REQUIRED' }] })).toEqual({
            code: 'REAUTH_REQUIRED'
        });
    });

    it('reads the error off a body that arrived as a JSON string', () => {
        // A `responseType: 'text'` request (the orders CSV export) delivers even its refusal so.
        expect(getFirstApiError(JSON.stringify({ errors: [{ code: 'REAUTH_REQUIRED' }] }))).toEqual(
            { code: 'REAUTH_REQUIRED' }
        );
        expect(getFirstApiError('<html>not json</html>')).toBeUndefined();
    });

    it('carries `details` through untouched', () => {
        // The 429 branch of the 2FA store reads `details.retryAfter` off exactly this.
        expect(
            getFirstApiError({
                errors: [{ code: 'TWO_FACTOR_RESEND_TOO_SOON', details: { retryAfter: 30 } }]
            })?.details
        ).toEqual({ retryAfter: 30 });
    });

    it('returns undefined for an empty `errors` array', () => {
        // Legal at the type level — the contract puts no length guarantee on it — so the readers
        // downstream must never index into it blind.
        expect(getFirstApiError({ errors: [] })).toBeUndefined();
    });

    it('returns undefined when `errors` is absent, not an array, or holds a non-object', () => {
        expect(getFirstApiError({ message: 'nope' })).toBeUndefined();
        expect(getFirstApiError({ errors: 'nope' })).toBeUndefined();
        expect(getFirstApiError({ errors: ['nope'] })).toBeUndefined();
    });

    it('returns undefined for a rejection that is not an object at all', () => {
        // A thrown string, or a transport failure with nothing in it.
        expect(getFirstApiError(undefined)).toBeUndefined();
        expect(getFirstApiError('boom')).toBeUndefined();
        expect(getFirstApiError(null)).toBeUndefined();
    });
});

/** A cooldown refusal as `onResponseReject` hands it on. */
const tooSoon = (code: string, retryAfter: unknown) =>
    aProblem(429, [{ code, message: 'Too soon', details: { retryAfter } }]);

describe('getRetryAfter', () => {
    it('reads the server`s seconds off the refusal it names', () => {
        expect(
            getRetryAfter(
                tooSoon('EMAIL_VERIFY_RESEND_TOO_SOON', 42),
                'EMAIL_VERIFY_RESEND_TOO_SOON'
            )
        ).toBe(42);
    });

    it('ignores another refusal`s number, and a number that is not one', () => {
        expect(
            getRetryAfter(tooSoon('RATE_LIMITED', 42), 'EMAIL_VERIFY_RESEND_TOO_SOON')
        ).toBeUndefined();
        expect(
            getRetryAfter(
                tooSoon('EMAIL_VERIFY_RESEND_TOO_SOON', '42'),
                'EMAIL_VERIFY_RESEND_TOO_SOON'
            )
        ).toBeUndefined();
        expect(getRetryAfter(new Error('network'), 'EMAIL_VERIFY_RESEND_TOO_SOON')).toBeUndefined();
    });
});
