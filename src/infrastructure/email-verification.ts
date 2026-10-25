/**
 * @module
 * The verification-mail resend, and the one 429 code both resend endpoints answer. Plain
 * functions: nothing here holds state, so nothing here is a store.
 */
import { requestEmailVerification as apiRequestEmailVerification } from '@api';
import { ERROR_CODES } from '@api/error-codes';
import { getPayloadFromResponse, getRetryAfter } from '@/infrastructure/http/envelope.ts';
import type { EmailVerificationRequested } from '@types';

/**
 * The server's own resend cooldown from a verification-mail 429, or `undefined` when the rejection
 * was something else. Both `POST /account/email-verification/resend` (the banner) and `POST
 * /account/email-change/resend` (the profile page) answer it under the one code
 * (`EMAIL_VERIFY_RESEND_TOO_SOON`), so it lives here beside the first call.
 *
 * @param error - The rejected value a verification-mail send threw.
 * @returns Seconds to wait, or `undefined`.
 */
export const emailVerifyResendRetryAfter = (error: unknown): number | undefined =>
    getRetryAfter(error, ERROR_CODES.EMAIL_VERIFY_RESEND_TOO_SOON);

/**
 * Asks for the address-verification email to be sent again — the shell banner's one action.
 *
 * @returns The server's own cooldown in seconds. A caller that counts this down never sees
 *  the 429 the endpoint answers inside it — the number is the server's, never the client's.
 */
export const requestEmailVerification = (): Promise<number> =>
    apiRequestEmailVerification().then(
        (data) => getPayloadFromResponse<EmailVerificationRequested>(data)?.resendAfter ?? 0
    );
