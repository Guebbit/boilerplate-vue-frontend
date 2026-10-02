/**
 * The backend an antibot run boots: the same demo backend, with its human-challenge provider
 * switched on.
 *
 * The provider is `altcha` — self-hosted proof-of-work, so it needs no vendor and no network. A
 * low cost keeps a solve fast; a fixed secret is required when `altcha` is selected, and this one
 * guards nothing (a throwaway demo backend on loopback). The variables are the backend's
 * `NODE_ANTIBOT_*` set (`.env-example`, "Anti-automation — rung 4").
 *
 * One more variable is not the provider's: the per-account login budget. The login check engages
 * once half of it is spent, and the run's other backends raise it far past reach, so this one
 * pins it small enough for a journey to get there in a few wrong passwords.
 *
 * Shared by the demo shard (`run-shards.ts`), the single-process `backend:demo --antibot`
 * (`run-backend.ts`) and the live workflow's antibot matrix entry, so all three boot the same thing.
 */

/** The environment that turns the provider on. */
export const ANTIBOT_BACKEND_ENV: Readonly<Record<string, string>> = {
    NODE_ANTIBOT_PROVIDER: 'altcha',
    NODE_ANTIBOT_ALTCHA_SECRET: 'e2e-not-a-secret-altcha-key',
    // PBKDF2 iterations a solver works through: far below the 100000 default, so a spec solves in milliseconds.
    NODE_ANTIBOT_ALTCHA_COST: '1000',
    // Failed logins one account may spend per window. The login check engages at the half (the
    // third wrong password), and `AC18` leaves the account at it. The other runs raise this far
    // past reach, so the live workflow falls back to its own value for them.
    NODE_AUTH_RATE_LIMIT_MAX: '6'
};

/** The argument `run-backend.ts` takes to boot with {@link ANTIBOT_BACKEND_ENV}. */
export const ANTIBOT_FLAG = '--antibot';

/**
 * Whether a command line asks for the antibot backend.
 *
 * @param argv - the arguments after the script name
 */
export const wantsAntibotBackend = (argv: readonly string[]): boolean =>
    argv.includes(ANTIBOT_FLAG);
