/**
 * @module
 * Unit tests for the antibot helpers: `withAntibotToken` (the header merge every gated form's
 * submit goes through), `isAntibotVerificationFailed` (the retry signal login/payment read off a
 * 401), and the two thin `@api` re-exports — `human-check.spec.ts` mocks both of those away
 * entirely to test `HumanCheck.vue`'s own branching, so this file is the only place proving they
 * actually delegate to the right generated call.
 */
import { describe, expect, it, vi } from 'vitest';
import {
    withAntibotToken,
    isAntibotVerificationFailed,
    fetchAntibotConfig,
    fetchAntibotChallenge
} from '@/infrastructure/http/antibot.ts';
import { getAntibotConfig, getAntibotChallenge } from '@api';

vi.mock('@api', () => ({
    getAntibotConfig: vi.fn(),
    getAntibotChallenge: vi.fn()
}));

/** A stand-in for a real per-call option, e.g. the one `signup` attaches. */
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

describe('fetchAntibotConfig', () => {
    it('delegates to GET /antibot/config', () => {
        vi.mocked(getAntibotConfig).mockResolvedValue('config-response' as never);
        return expect(fetchAntibotConfig()).resolves.toBe('config-response');
    });
});

describe('fetchAntibotChallenge', () => {
    it('delegates to GET /antibot/challenge', () => {
        vi.mocked(getAntibotChallenge).mockResolvedValue('challenge-response' as never);
        return expect(fetchAntibotChallenge()).resolves.toBe('challenge-response');
    });
});
