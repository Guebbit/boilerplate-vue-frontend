/**
 * @module
 * Unit tests for the two pure antibot helpers: `withAntibotToken` (the header merge every gated
 * form's submit goes through) and `isAntibotVerificationFailed` (the retry signal login/payment
 * read off a 401). `fetchAntibotConfig`/`fetchAntibotChallenge` are thin `@api` re-exports with no
 * logic of their own — exercised through `tests/unit/ui/human-check.spec.ts` instead.
 */
import { describe, expect, it } from 'vitest';
import { withAntibotToken, isAntibotVerificationFailed } from '@/infrastructure/http/antibot.ts';

/** A stand-in for a real per-call option, e.g. the one `signupWithMultipart` attaches. */
const onUploadProgress = () => {};

describe('withAntibotToken', () => {
    it('returns options unchanged when there is no token', () => {
        const options = { onUploadProgress: () => {} };
        expect(withAntibotToken(undefined, options)).toBe(options);
    });

    it('returns undefined unchanged when there is neither a token nor options', () => {
        expect(withAntibotToken(undefined)).toBeUndefined();
    });

    it('attaches the header when a token is given', () => {
        expect(withAntibotToken('solved-token')).toEqual({
            headers: { 'x-antibot-challenge-token': 'solved-token' }
        });
    });

    it('keeps the caller’s other headers next to the new one', () => {
        const result = withAntibotToken('solved-token', { headers: { 'X-Custom': '1' } });
        expect(result?.headers).toEqual({
            'X-Custom': '1',
            'x-antibot-challenge-token': 'solved-token'
        });
    });

    it('keeps the caller’s non-header options (e.g. onUploadProgress) alongside the header', () => {
        const result = withAntibotToken('solved-token', { onUploadProgress });
        expect(result?.onUploadProgress).toBe(onUploadProgress);
        expect(result?.headers).toEqual({ 'x-antibot-challenge-token': 'solved-token' });
    });
});

describe('isAntibotVerificationFailed', () => {
    it('is true for the exact refusal code', () => {
        expect(
            isAntibotVerificationFailed({ errors: [{ code: 'ANTIBOT_VERIFICATION_FAILED' }] })
        ).toBe(true);
    });

    it('is false for any other structured error', () => {
        expect(isAntibotVerificationFailed({ errors: [{ code: 'REAUTH_REQUIRED' }] })).toBe(false);
    });

    it('is false for a value with no structured error at all', () => {
        expect(isAntibotVerificationFailed(undefined)).toBe(false);
        expect(isAntibotVerificationFailed(new Error('network down'))).toBe(false);
    });
});
