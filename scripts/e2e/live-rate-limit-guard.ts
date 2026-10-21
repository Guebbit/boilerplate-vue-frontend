/**
 * The live profile's refusal to start without the limiter's Redis URL.
 *
 * Why it exists: the backend keeps its rate-limit counters in Redis only when
 * `NODE_RATE_LIMIT_REDIS_URL` is set. Without it they live in the server process, and the reseed
 * between specs (`LIVE_RESET_COMMAND`, run through `cy.exec`) cannot reach them. The reseed does
 * warn, but `cy.exec` swallows the warning, so the run just fails later: the sixth card payment
 * of the seeded customer answers 429 and the journey times out on a missing `payment-status`.
 * Refusing to start turns that hours-long mystery into one line at the top of the run.
 *
 * See: docs/tools/live-e2e.md (the recipe, step 3)
 */

/**
 * Throws when a live-profile run has no Redis URL for the limiter's counters.
 *
 * @param liveProfile - whether this run targets the live backend (`CYPRESS_liveProfile=true`)
 * @param redisUrl - this process's `NODE_RATE_LIMIT_REDIS_URL`, if any
 * @throws {Error} Naming the variable and where the recipe sets it. Never throws on the demo profile.
 */
export const assertLiveRateLimitStore = (liveProfile: boolean, redisUrl?: string): void => {
    if (!liveProfile) return;
    if (redisUrl !== undefined && redisUrl.trim() !== '') return;
    throw new Error(
        'Live profile: NODE_RATE_LIMIT_REDIS_URL is not set in this shell. Without it the limiter counts in the backend process, the reseed between specs cannot clear them, and card-pay journeys fail with a 429. Export the same value as the backend (docs/tools/live-e2e.md, step 3).'
    );
};
