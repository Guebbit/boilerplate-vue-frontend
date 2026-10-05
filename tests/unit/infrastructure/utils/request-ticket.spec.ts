/**
 * @module
 * The request-ticket ordering: a later request's answer wins however the network delivers them, a
 * reset kills what was in flight, and the first answer of a new era applies.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createRequestTickets } from '@/infrastructure/utils/request-ticket.ts';

describe('createRequestTickets', () => {
    it('applies answers that arrive in the order the requests left', () => {
        const tickets = createRequestTickets();
        const first = tickets.take();
        const second = tickets.take();

        expect(first()).toBe(true);
        expect(second()).toBe(true);
    });

    it('refuses an older answer once a newer one was applied', () => {
        const tickets = createRequestTickets();
        const older = tickets.take();
        const newer = tickets.take();

        expect(newer()).toBe(true);
        expect(older()).toBe(false);
    });

    it('applies a newer answer even when an older one is still out', () => {
        const tickets = createRequestTickets();
        tickets.take();
        const newer = tickets.take();

        expect(newer()).toBe(true);
    });

    it('lets whichever answer is applied last in ticket order win, for any delivery order', () => {
        fc.assert(
            fc.property(fc.shuffledSubarray([0, 1, 2, 3, 4], { minLength: 5 }), (order) => {
                const tickets = createRequestTickets();
                const claims = [0, 1, 2, 3, 4].map(() => tickets.take());
                const applied = order.filter((index) => claims[index]?.());

                // What was applied is strictly increasing, so the freshest request ends up on screen.
                expect(applied).toEqual(applied.toSorted((a, b) => a - b));
                expect(applied.at(-1)).toBe(4);
            }),
            { seed: 20_261_005, numRuns: 100 }
        );
    });

    it('kills every ticket taken before a reset, and the answers of its era', () => {
        const tickets = createRequestTickets();
        const before = tickets.take();
        tickets.reset();

        expect(before()).toBe(false);
        expect(before.isSameEra()).toBe(false);
    });

    it('applies the first answer of a new era', () => {
        const tickets = createRequestTickets();
        tickets.take();
        tickets.reset();
        const after = tickets.take();

        expect(after()).toBe(true);
        expect(after.isSameEra()).toBe(true);
    });

    it('keeps the era of a ticket whose answer lost to a fresher one', () => {
        const tickets = createRequestTickets();
        const older = tickets.take();
        tickets.take()();

        expect(older()).toBe(false);
        expect(older.isSameEra()).toBe(true);
    });
});
