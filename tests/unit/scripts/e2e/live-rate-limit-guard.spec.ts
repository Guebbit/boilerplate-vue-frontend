/**
 * `scripts/e2e/live-rate-limit-guard.ts` — a live run with no Redis URL for the limiter.
 *
 * The failure worth guarding is the late, silent one: the run starts, the reseed cannot clear the
 * counters, and hours later a card journey answers 429. The guard says so before the first spec.
 */
import { describe, expect, it } from 'vitest';
import { assertLiveRateLimitStore } from '../../../../scripts/e2e/live-rate-limit-guard';

describe('assertLiveRateLimitStore', () => {
    it('refuses a live run with no Redis URL, naming the variable', () => {
        expect(() => assertLiveRateLimitStore(true, undefined)).toThrow(
            /NODE_RATE_LIMIT_REDIS_URL/
        );
    });

    it('refuses a live run whose Redis URL is blank', () => {
        expect(() => assertLiveRateLimitStore(true, '   ')).toThrow(/NODE_RATE_LIMIT_REDIS_URL/);
    });

    it('lets a live run through when the URL is set', () => {
        expect(() => assertLiveRateLimitStore(true, 'redis://127.0.0.1:6379')).not.toThrow();
    });

    it('never asks the demo profile for it', () => {
        expect(() => assertLiveRateLimitStore(false, undefined)).not.toThrow();
    });
});
