/**
 * `scripts/e2e/totp.ts` — the authenticator code a journey types.
 */
import { describe, expect, it } from 'vitest';
import { verify } from 'otplib';
import { totpCode } from '../../../../scripts/e2e/totp';

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
