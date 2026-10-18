/**
 * `scripts/e2e/totp.ts` — the authenticator code a journey types.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verify } from 'otplib';
import {
    forgetLoginCodes,
    loginTotpCode,
    loginTotpCodeFor,
    totpCode
} from '../../../../scripts/e2e/totp';

/** RFC 6238's own test secret (ASCII "12345678901234567890", base32). */
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totpCode', () => {
    it('is six digits', () =>
        totpCode({ secret: SECRET, stepsFromNow: 0 }).then((code) => {
            expect(code).toMatch(/^\d{6}$/);
        }));

    it('matches the RFC 6238 vector for the time it is asked at', () =>
        // RFC 6238 appendix B, SHA-1, T = 59 s: 94287082 as eight digits, so 287082 as six.
        totpCode({ secret: SECRET, stepsFromNow: 0 }, 59_000).then((code) => {
            expect(code).toBe('287082');
        }));

    it('mints the next step for a step ahead, which differs from now', () =>
        Promise.all([
            totpCode({ secret: SECRET, stepsFromNow: 0 }, 59_000),
            totpCode({ secret: SECRET, stepsFromNow: 1 }, 59_000)
        ]).then(([now, next]) => {
            expect(next).not.toBe(now);
        }));

    it('is accepted by the library the backend verifies with, at the step it was minted for', () =>
        totpCode({ secret: SECRET, stepsFromNow: 0 }, 1_111_111_109_000).then((code) => {
            expect(code).toBe('081804');
            return verify({ secret: SECRET, token: code, epoch: 1_111_111_109 }).then((result) => {
                expect(result.valid).toBe(true);
            });
        }));
});

/** A wait that does not wait. */
const noSleep = () => Promise.resolve();

describe('loginTotpCode', () => {
    /** A clock sitting 5 s into step 100 (3000 s in). */
    const AT = 100 * 30 * 1000 + 5000;

    it('hands out a step once, earliest first: the current step, then the next', async () => {
        forgetLoginCodes();
        const codes: string[] = [];
        for (let i = 0; i < 2; i += 1) codes.push(await loginTotpCode(SECRET, () => AT, noSleep));

        expect(new Set(codes).size).toBe(2);
        expect(codes[0]).toBe(await totpCode({ secret: SECRET, stepsFromNow: 0 }, AT));
        expect(codes[1]).toBe(await totpCode({ secret: SECRET, stepsFromNow: 1 }, AT));
    });

    it('waits for the next step when both are spent, then mints from it', async () => {
        forgetLoginCodes();
        let clock = AT;
        for (let i = 0; i < 2; i += 1) await loginTotpCode(SECRET, () => clock, noSleep);
        const slept: number[] = [];

        const code = await loginTotpCode(
            SECRET,
            () => clock,
            (ms) => {
                slept.push(ms);
                clock += ms;
                return Promise.resolve();
            }
        );

        expect(slept).toHaveLength(1);
        expect(slept[0]).toBeGreaterThan(24_000);
        expect(code).toMatch(/^\d{6}$/);
    });

    it('starts over once the memory is forgotten', async () => {
        forgetLoginCodes();
        const first = await loginTotpCode(SECRET, () => AT, noSleep);
        forgetLoginCodes();

        expect(await loginTotpCode(SECRET, () => AT, noSleep)).toBe(first);
    });
});

describe('loginTotpCodeFor', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        forgetLoginCodes();
    });

    it('mints from the clock the backend serves, so a jumped demo clock still verifies', async () => {
        forgetLoginCodes();
        const served = 1_111_111_109_000;
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ now: new Date(served).toISOString() })
                })
            )
        );

        const code = await loginTotpCodeFor(SECRET, 'http://api.test');

        // The step the served clock sits in, give or take the few milliseconds the test took.
        expect(code).toBe(await totpCode({ secret: SECRET, stepsFromNow: 0 }, served));
    });

    it('falls back to this machine’s clock when the backend has no clock route', async () => {
        forgetLoginCodes();
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve(null) }))
        );

        expect(await loginTotpCodeFor(SECRET, 'http://api.test')).toMatch(/^\d{6}$/);
    });

    it('forgets a mark left by a clock that has since been put back', async () => {
        forgetLoginCodes();
        const later = 200 * 30 * 1000;
        await loginTotpCode(
            SECRET,
            () => later,
            () => Promise.resolve()
        );
        const slept: number[] = [];

        await loginTotpCode(
            SECRET,
            () => 100 * 30 * 1000 + 5000,
            (ms) => {
                slept.push(ms);
                return Promise.resolve();
            }
        );

        expect(slept).toEqual([]);
    });
});
