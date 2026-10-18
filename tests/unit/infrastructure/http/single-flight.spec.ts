/**
 * @module
 * Unit tests for `singleFlight()`: concurrent callers share one in-flight promise, and a fresh
 * call after the first settles starts a genuinely new attempt — the property `refresh.ts` and
 * `step-up.ts` both depend on for de-duplicating a 401's recovery.
 */
import { describe, expect, it, vi } from 'vitest';
import { exclusiveRunner, singleFlight } from '@/infrastructure/http/single-flight.ts';

describe('singleFlight', () => {
    it('shares one in-flight promise between callers that overlap', () => {
        const start = vi.fn(() => Promise.resolve('ok'));
        const wrapped = singleFlight(start);

        const first = wrapped();
        const second = wrapped();

        expect(start).toHaveBeenCalledTimes(1);
        return Promise.all([first, second]).then(([a, b]) => {
            expect(a).toBe('ok');
            expect(b).toBe('ok');
        });
    });

    it('starts a genuinely new attempt once the previous one has settled', () =>
        Promise.resolve().then(() => {
            const start = vi.fn(() => Promise.resolve('ok'));
            const wrapped = singleFlight(start);

            return wrapped()
                .then(() => wrapped())
                .then(() => {
                    expect(start).toHaveBeenCalledTimes(2);
                });
        }));

    it('starts a new attempt after a failed one — a rejection does not wedge it forever', () => {
        let attempt = 0;
        const wrapped = singleFlight(() => {
            attempt += 1;
            return attempt === 1 ? Promise.reject(new Error('nope')) : Promise.resolve('ok');
        });

        return expect(wrapped())
            .rejects.toThrow('nope')
            .then(() => wrapped())
            .then((result) => {
                expect(result).toBe('ok');
                expect(attempt).toBe(2);
            });
    });
});

describe('exclusiveRunner', () => {
    it('joins a second action started while the first runs, whichever action it is', () => {
        const run = exclusiveRunner();
        const first = vi.fn(() => Promise.resolve('first'));
        const second = vi.fn(() => Promise.resolve('second'));

        const one = run(first);
        const two = run(second);

        expect(second).not.toHaveBeenCalled();
        return Promise.all([one, two]).then(([a, b]) => {
            expect(a).toBe('first');
            expect(b).toBe('first');
        });
    });

    it('lets the next action start once the previous one settled, failed or not', () => {
        const run = exclusiveRunner();

        return run(() => Promise.reject(new Error('refused')))
            .catch(() => undefined)
            .then(() => run(() => Promise.resolve('again')))
            .then((answer) => {
                expect(answer).toBe('again');
            });
    });
});
