/**
 * @module
 * The request-task ordering: a later request's answer wins however the network delivers them, a
 * reset kills what was in flight, and the first answer of a new era applies.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createRequestTasks } from '@/infrastructure/utils/request-task.ts';

describe('createRequestTasks', () => {
    it('applies answers that arrive in the order the requests left', () => {
        const tasks = createRequestTasks();
        const first = tasks.take();
        const second = tasks.take();

        expect(first()).toBe(true);
        expect(second()).toBe(true);
    });

    it('refuses an older answer once a newer one was applied', () => {
        const tasks = createRequestTasks();
        const older = tasks.take();
        const newer = tasks.take();

        expect(newer()).toBe(true);
        expect(older()).toBe(false);
    });

    it('applies a newer answer even when an older one is still out', () => {
        const tasks = createRequestTasks();
        tasks.take();
        const newer = tasks.take();

        expect(newer()).toBe(true);
    });

    it('lets whichever answer is applied last in task order win, for any delivery order', () => {
        fc.assert(
            fc.property(fc.shuffledSubarray([0, 1, 2, 3, 4], { minLength: 5 }), (order) => {
                const tasks = createRequestTasks();
                const claims = [0, 1, 2, 3, 4].map(() => tasks.take());
                const applied = order.filter((index) => claims[index]?.());

                // What was applied is strictly increasing, so the freshest request ends up on screen.
                expect(applied).toEqual(applied.toSorted((a, b) => a - b));
                expect(applied.at(-1)).toBe(4);
            }),
            { seed: 20_261_005, numRuns: 100 }
        );
    });

    it('kills every task taken before a reset, and the answers of its era', () => {
        const tasks = createRequestTasks();
        const before = tasks.take();
        tasks.reset();

        expect(before()).toBe(false);
        expect(before.isSameEra()).toBe(false);
    });

    it('applies the first answer of a new era', () => {
        const tasks = createRequestTasks();
        tasks.take();
        tasks.reset();
        const after = tasks.take();

        expect(after()).toBe(true);
        expect(after.isSameEra()).toBe(true);
    });

    it('keeps the era of a task whose answer lost to a fresher one', () => {
        const tasks = createRequestTasks();
        const older = tasks.take();
        tasks.take()();

        expect(older()).toBe(false);
        expect(older.isSameEra()).toBe(true);
    });
});
