/**
 * @module
 * `use-line-quantity.ts` — the debounce that removed a real race, tested as the race.
 *
 * The old steppers sent one request per click, and the store replaces the whole cart with each
 * response, so three fast clicks on `+` raced three requests and the cart kept whichever answered
 * LAST. Every assertion here is written against that failure rather than against the debounce:
 * "one request, for the final number" is the fix; "the number on screen moves on the click" is why
 * the fix costs the visitor nothing; "a step made during a flight is not swallowed" and "a flush
 * on unmount, never a cancel" are the two ways a debounce silently loses data instead.
 *
 * Fake timers throughout, because the delay is the subject: a real 400ms wait would make this
 * suite slow AND flaky, which is the usual reason a debounce ends up untested.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLineQuantity } from '@/modules/cart/composables/use-line-quantity';

const DELAY = 400;

/**
 * Deferred promises, so a request can be left in flight for as long as a test needs.
 */
const makeUpdate = () => {
    const settle: ((value: unknown) => void)[] = [];
    const calls: [productId: string, quantity: number][] = [];

    const update = vi.fn((productId: string, quantity: number) => {
        calls.push([productId, quantity]);
        return new Promise((resolve) => settle.push(resolve));
    });

    const settleAll = () => {
        for (const resolve of settle) resolve(undefined);
    };

    return { update, calls, settleAll, resolvers: settle };
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useLineQuantity — the race it removes', () => {
    it('sends ONE request, for the number the visitor stopped on', () => {
        const { update, calls } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        lines.stepQuantity('p1', 1, 1);
        lines.stepQuantity('p1', 1, 1);
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            // Three requests here was the bug: 2, 3 and 4 in flight, last answer wins.
            expect(update).toHaveBeenCalledTimes(1);
            expect(calls).toEqual([['p1', 4]]);
        });
    });

    it('keeps two lines independent', () => {
        // Debouncing globally would make stepping one line cancel the other's pending change.
        const { update, calls } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        lines.stepQuantity('p2', 5, -1);
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(calls).toHaveLength(2);
            expect(calls).toContainEqual(['p1', 2]);
            expect(calls).toContainEqual(['p2', 4]);
        });
    });

    it('sends nothing until the visitor stops clicking', () => {
        const { update } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        return vi.advanceTimersByTimeAsync(DELAY - 1).then(() => {
            expect(update).not.toHaveBeenCalled();
        });
    });
});

describe('useLineQuantity — what the visitor sees', () => {
    it('moves the number on the click, not on the round trip', () => {
        // Without this the debounce would just be latency: 400ms of a stepper doing nothing.
        const lines = useLineQuantity(makeUpdate().update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);

        expect(lines.quantityOf('p1', 1)).toBe(2);
    });

    it('hands the line back to the store once the API has been told', () => {
        const { update, settleAll } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        return vi
            .advanceTimersByTimeAsync(DELAY)
            .then(() => {
                settleAll();
                return vi.advanceTimersByTimeAsync(0);
            })
            .then(() => {
                // The stored quantity is authoritative again, so a change made elsewhere is not masked.
                expect(lines.quantityOf('p1', 9)).toBe(9);
            });
    });

    it('reports a failed send and stops showing a number the API rejected', () => {
        const onError = vi.fn();
        const update = vi.fn(() => Promise.reject(new Error('nope')));
        const lines = useLineQuantity(update, onError, DELAY);

        lines.stepQuantity('p1', 1, 1);
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(onError).toHaveBeenCalledOnce();
            expect(lines.quantityOf('p1', 1)).toBe(1);
        });
    });

    it('never steps a line below the floor', () => {
        // The domain rule: zero is a removal, which is a different call.
        const lines = useLineQuantity(makeUpdate().update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, -1);

        expect(lines.quantityOf('p1', 1)).toBe(1);
    });
});

describe('useLineQuantity — the ways a debounce loses data', () => {
    it('does not swallow a click made while the request was in flight', async () => {
        const { update, calls, settleAll } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        await vi.advanceTimersByTimeAsync(DELAY);
        // The visitor clicks again before the first request has answered.
        lines.stepQuantity('p1', 1, 1);
        settleAll();
        await vi.advanceTimersByTimeAsync(0);

        // Clearing the pending entry unconditionally on settle would drop the 3 here.
        expect(lines.quantityOf('p1', 1)).toBe(3);

        await vi.advanceTimersByTimeAsync(DELAY);
        expect(calls).toEqual([
            ['p1', 2],
            ['p1', 3]
        ]);
    });

    it('flushes on unmount rather than cancelling', () => {
        // A step made and then navigated away from is a change the visitor asked for. Dropping it
        // because the timer had 200ms left is the debounce losing the data it exists to protect.
        const { update, calls } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        lines.flushPending();

        expect(calls).toEqual([['p1', 2]]);
    });

    it('forgets a removed line, so a queued step cannot resurrect it', () => {
        const { update } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        lines.forget('p1');
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(update).not.toHaveBeenCalled();
            expect(lines.quantityOf('p1', 1)).toBe(1);
        });
    });
});

describe('useLineQuantity — FA34: checkout and clear must not race a pending step', () => {
    it('settle flushes the pending step immediately, then waits for it to land', async () => {
        const { update, calls, settleAll } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        let settled = false;
        const done = lines.settle().then(() => {
            settled = true;
        });

        // Flushed synchronously — the request is already out — but nothing has answered it yet.
        // flushPending alone would stop right here, which is the bug this composable had.
        expect(calls).toEqual([['p1', 2]]);
        expect(settled).toBe(false);

        settleAll();
        await done;
        expect(settled).toBe(true);
    });

    it('settle resolves immediately when nothing is pending', () =>
        expect(
            useLineQuantity(makeUpdate().update, vi.fn(), DELAY).settle()
        ).resolves.toBeUndefined());

    it('settle rejects when a flushed step failed to reach the server (PL-63)', async () => {
        const onError = vi.fn();
        const update = vi.fn(() => Promise.reject(new Error('nope')));
        const lines = useLineQuantity(update, onError, DELAY);

        lines.stepQuantity('p1', 1, 1);
        // `settle` flushes synchronously, so the rejection is attached in the same tick it is
        // produced — no gap where nothing has claimed it yet.
        await expect(lines.settle()).rejects.toThrow();
        // The per-line toast is still `onError`'s job — settle rejecting is only the signal a
        // caller like checkout needs to stop, not a second report of the same failure.
        expect(onError).toHaveBeenCalledOnce();
    });

    it('does not stop waiting on a newer request because an older one for the same line just landed (PL-64)', async () => {
        const { update, calls, resolvers } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        await vi.advanceTimersByTimeAsync(DELAY);
        // Request A ("p1", 2) is now out, unresolved. A second click arrives before it answers,
        // and is flushed immediately rather than waiting out another whole debounce window — the
        // overlap this bug needs: two requests for the same line in flight at once.
        lines.stepQuantity('p1', 2, 1);
        lines.flushPending();
        expect(calls).toEqual([
            ['p1', 2],
            ['p1', 3]
        ]);

        // Request A resolves first. The old code deleted `inFlight`'s entry unconditionally here
        // — which by now holds request B, not A — so a `settle()` afterwards would not wait for
        // B at all.
        resolvers[0]?.(undefined);
        await vi.advanceTimersByTimeAsync(0);

        let settled = false;
        const done = lines.settle().then(() => {
            settled = true;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(settled).toBe(false);

        resolvers[1]?.(undefined);
        await done;
        expect(settled).toBe(true);
    });

    it('forgetAll cancels every line, so none of them fire after a clear', () => {
        const { update } = makeUpdate();
        const lines = useLineQuantity(update, vi.fn(), DELAY);

        lines.stepQuantity('p1', 1, 1);
        lines.stepQuantity('p2', 5, -1);
        lines.forgetAll();

        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(update).not.toHaveBeenCalled();
            expect(lines.quantityOf('p1', 1)).toBe(1);
            expect(lines.quantityOf('p2', 5)).toBe(5);
        });
    });
});
