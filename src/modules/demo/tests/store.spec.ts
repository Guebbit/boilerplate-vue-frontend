/**
 * The counter store — the boilerplate's worked example of state, getter, action and async action.
 *
 * Tested because it is demonstrated: a Playground showing a broken counter teaches the wrong
 * thing, and `exampleGuard` increments this very store to prove a guard can reach one.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDemoStore } from '../store';

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('counter store', () => {
    it('starts at zero and doubles as it goes', () => {
        const store = useDemoStore();

        expect(store.count).toBe(0);
        expect(store.doubleCount).toBe(0);

        store.increment();

        expect(store.count).toBe(1);
        expect(store.doubleCount).toBe(2);
    });

    it('increments after the delay, not before it', () => {
        vi.useFakeTimers();
        const store = useDemoStore();

        const pending = store.incrementDelayed();
        // The whole point of the async action: nothing has happened yet.
        expect(store.count).toBe(0);

        vi.advanceTimersByTime(1000);

        return pending.then(() => {
            expect(store.count).toBe(1);
            vi.useRealTimers();
        });
    });
});
