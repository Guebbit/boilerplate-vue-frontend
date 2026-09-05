/**
 * @module
 * Unit tests for the envelope readers — the `{ data }` wrapper and the `{ errors }` list. Each
 * case names the response shape it stands for, rather than an invented one that happens to pass.
 */
import { describe, expect, it } from 'vitest';
import {
    getFirstApiError,
    getPayloadFromResponse,
    getTokenFromResponse
} from '@/infrastructure/http/envelope.ts';

describe('getTokenFromResponse', () => {
    it('reads the token out of the wrapped envelope the contract declares', () => {
        // `LoginResponseEnvelope` and the refresh envelope both put it here.
        expect(getTokenFromResponse({ data: { token: 'jwt' } })).toBe('jwt');
    });

    it('ignores an unwrapped body: no endpoint answers one, and a token outside the envelope is not this contract', () => {
        expect(getTokenFromResponse({ token: 'jwt' })).toBeUndefined();
    });

    it('returns undefined for an envelope carrying no token', () => {
        // The MFA-challenge branch of `LoginOutcome` lands here: a 200 with no token in it.
        expect(getTokenFromResponse({ data: { mfaRequired: true } })).toBeUndefined();
    });

    it('returns undefined for a response that is not an object at all', () => {
        expect(getTokenFromResponse(undefined)).toBeUndefined();
        expect(getTokenFromResponse('jwt')).toBeUndefined();
        expect(getTokenFromResponse(null)).toBeUndefined();
    });
});

describe('getPayloadFromResponse', () => {
    it('unwraps a wrapped payload', () => {
        expect(getPayloadFromResponse({ data: { id: 'p1' } })).toEqual({ id: 'p1' });
    });

    it('passes an unwrapped payload through untouched', () => {
        expect(getPayloadFromResponse({ id: 'p1' })).toEqual({ id: 'p1' });
    });

    it('reads a present-but-undefined `data` as undefined rather than as the envelope', () => {
        // A 204-shaped envelope. `'data' in response` is true, so the key's presence decides —
        // returning the envelope itself here would hand every caller the wrapper.
        expect(getPayloadFromResponse({ data: undefined })).toBeUndefined();
    });

    it('returns undefined when there is no response', () => {
        // Explicit type argument: inferred from `undefined` alone, `T` lands on `void` and the
        // call reads as a void expression rather than as the payload read it is.
        expect(getPayloadFromResponse<{ id: string }>(undefined)).toBeUndefined();
    });
});

describe('getFirstApiError', () => {
    it('reads the first structured error off a reject envelope', () => {
        // What `onResponseReject` builds, and what `step-up.ts` reads `REAUTH_REQUIRED` from.
        expect(getFirstApiError({ success: false, errors: [{ code: 'REAUTH_REQUIRED' }] })).toEqual(
            { code: 'REAUTH_REQUIRED' }
        );
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
