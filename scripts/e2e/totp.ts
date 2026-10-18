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

/** How far behind the clock a login code is minted: more than a request's round trip, less than a step. */
const CLOCK_MARGIN_MS = 1500;

/** The newest time step each secret's login code was minted for, so the next login picks a later one. */
const lastLoginStep = new Map<string, number>();

/**
 * Waits `ms` — a seam of its own so the unit test can pass a fake instead of a real 30 seconds.
 *
 * @param ms - how long, in milliseconds
 */
const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

/**
 * The code for a staff login: the earliest step the backend will still accept that no earlier login
 * of this secret has used.
 *
 * The backend refuses a step twice (replay protection) and accepts the current step and the next
 * one (the step before is refused although the tolerance is symmetric), so a run has two codes per
 * half-minute per secret. A spec that signs one account in more often
 * than that waits for the clock to open the next step rather than fail on a replay.
 *
 * @param secret - the staff account's base32 secret (`ScenarioAccount.totpSecret`)
 * @param now - the clock in milliseconds; injectable for the unit test
 * @param sleep - how to wait for the next step; injectable for the unit test
 */
export const loginTotpCode = (
    secret: string,
    now: () => number = Date.now,
    sleep: (ms: number) => Promise<void> = wait
): Promise<string> => {
    // Read the clock a little behind: the backend's own reading is a request away, so a code minted
    // for a step this side thinks has begun can be one step ahead of what the backend accepts.
    const reading = now() - CLOCK_MARGIN_MS;
    const current = Math.floor(reading / 1000 / STEP_SECONDS);
    // A mark from the future belongs to a clock that has since been put back (a restore): forget it.
    if ((lastLoginStep.get(secret) ?? Number.NEGATIVE_INFINITY) > current + 1)
        lastLoginStep.delete(secret);
    const used = lastLoginStep.get(secret) ?? Number.NEGATIVE_INFINITY;
    const step = [current, current + 1].find((candidate) => candidate > used);

    if (step === undefined) {
        // Every step the backend accepts is spent: wait until the clock opens the next one.
        const untilNext = (current + 1) * STEP_SECONDS * 1000 - reading;
        return sleep(Math.max(untilNext, 0) + 50).then(() => loginTotpCode(secret, now, sleep));
    }

    lastLoginStep.set(secret, step);
    return generate({ secret, epoch: step * STEP_SECONDS });
};

/**
 * Forgets which steps were used. Called when the backend's data is restored: the restore resets
 * the replay mark too, so the memory would only make the next login wait for nothing.
 */
export const forgetLoginCodes = (): null => {
    lastLoginStep.clear();
    return null;
};

/**
 * {@link loginTotpCode} against the clock the BACKEND keeps. The demo backend's clock can be moved
 * (`cy.travel`), and its replay window follows it, so a code minted from this machine's clock after
 * a jump is refused. A live backend has no such route and shares this machine's clock, which is
 * the fallback.
 *
 * @param secret - the staff account's base32 secret
 * @param apiUrl - the API base URL, no trailing slash
 */
export const loginTotpCodeFor = (secret: string, apiUrl: string): Promise<string> =>
    fetch(`${apiUrl}/__test/clock`)
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { now?: string } | null) => {
            const served = body?.now === undefined ? Number.NaN : Date.parse(body.now);
            return Number.isNaN(served) ? 0 : served - Date.now();
        })
        .catch(() => 0)
        .then((skew) => loginTotpCode(secret, () => Date.now() + skew));
