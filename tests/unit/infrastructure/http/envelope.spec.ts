/**
 * @module
 * Unit tests for the `{ data }` envelope readers.
 *
 * These were covered only incidentally before — through a store spec whose login fixture happened
 * to be unwrapped — so the tolerance branch was exercised by a shape the contract never returns,
 * and nothing said why that branch exists. Each case here names the response shape it stands for.
 */
import { describe, expect, it } from 'vitest';
import { getPayloadFromResponse, getTokenFromResponse } from '@/infrastructure/http/envelope.ts';

describe('getTokenFromResponse', () => {
    it('reads the token out of the wrapped envelope the contract declares', () => {
        // `LoginResponseEnvelope` and the refresh envelope both put it here.
        expect(getTokenFromResponse({ data: { token: 'jwt' } })).toBe('jwt');
    });

    it('tolerates a bare top-level token', () => {
        // Deliberate leniency, not a contract shape: no endpoint answers this. It exists so a
        // proxy or a hand-rolled stub that flattens the envelope still logs someone in.
        expect(getTokenFromResponse({ token: 'jwt' })).toBe('jwt');
    });

    it('prefers the top-level token when a response somehow carries both', () => {
        // The order in the implementation, pinned: whoever flattened the envelope is the one
        // closer to the caller, so their value wins rather than the nested one.
        expect(getTokenFromResponse({ token: 'flat', data: { token: 'nested' } })).toBe('flat');
    });

    it('ignores a non-string top-level token and falls through to the envelope', () => {
        // `token: null` from a serializer that emits nulls for absent fields must not shadow the
        // real one — the check is `typeof === 'string'`, not truthiness.
        expect(getTokenFromResponse({ token: null, data: { token: 'jwt' } })).toBe('jwt');
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
