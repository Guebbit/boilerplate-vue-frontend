/**
 * `src/infrastructure/email-verification.ts`: the resend call answers the server's own cooldown,
 * and the shared 429 code is read as seconds to wait. Only `@api` is mocked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as schemas from '@api/schemas';
import { contractResponse } from './http/orval-fixture-schema.ts';

// Deliberately untyped: the mock returns case-by-case fixture shapes the generated types refuse.
const requestEmailVerificationMock = vi.fn();

vi.mock('@api', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    requestEmailVerification: () => requestEmailVerificationMock()
}));

/** The code under test, imported after the mocks are in place. */
const { requestEmailVerification, emailVerifyResendRetryAfter } =
    await import('@/infrastructure/email-verification.ts');

beforeEach(() => {
    vi.clearAllMocks();
});

describe('requestEmailVerification', () => {
    it("resolves with the server's own resend cooldown", () => {
        requestEmailVerificationMock.mockResolvedValue(
            contractResponse(schemas.RequestEmailVerificationResponse, { resendAfter: 60 })
        );

        return requestEmailVerification().then((resendAfter) => {
            expect(resendAfter).toBe(60);
        });
    });
});

describe('emailVerifyResendRetryAfter', () => {
    it('is undefined for a rejection that is not the resend cooldown', () => {
        expect(emailVerifyResendRetryAfter(new Error('offline'))).toBeUndefined();
    });
});
