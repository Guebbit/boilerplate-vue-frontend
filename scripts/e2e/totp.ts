/**
 * The code an authenticator app would show for a TOTP secret, so a journey can enrol one and then
 * sign in with it.
 *
 * Pure of Cypress, and outside `tests/support/e2e/`, so the unit suite can pin it without a
 * browser. It runs in Cypress' Node process (`cy.task('totpCode')`), because the browser bundle
 * has no business carrying a crypto library. The same library, at the same major, as the backend
 * that verifies the code.
 */
import { generate } from 'otplib';

/** One RFC 6238 time step, in seconds — what every authenticator app defaults to. */
const STEP_SECONDS = 30;

/** What {@link totpCode} takes. */
export interface TotpRequest {
    /** The base32 secret the enrolment screen shows. */
    secret: string;
    /**
     * How many 30-second steps ahead of now to mint the code for. A code that confirms a fresh
     * enrolment wants 0; every code after it wants at least 1, because the backend refuses to
     * accept a step twice (replay protection) and accepts one step of drift either way, so a code
     * for the next step verifies at once instead of after a real 30-second wait.
     */
    stepsFromNow: number;
}

/**
 * The six digits for a secret, at a step relative to now.
 *
 * @param request - the secret and how far ahead to mint
 * @param now - the clock, in milliseconds; injectable for the unit test
 */
export const totpCode = (
    { secret, stepsFromNow }: TotpRequest,
    now: number = Date.now()
): Promise<string> =>
    // https://otplib.yeojz.dev/ — `epoch` is in seconds; the secret is base32 and the period 30 s.
    generate({ secret, epoch: Math.floor(now / 1000) + stepsFromNow * STEP_SECONDS });
