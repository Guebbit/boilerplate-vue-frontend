/**
 * @module
 * `useStaleRecord` — what an edit form does with a 412: recognise it, say so as a warning, and
 * offer a reload that clears the warning and re-reads the record. Anything that is not a 412 is
 * left to the caller, untouched.
 */
import { describe, expect, it, vi } from 'vitest';
import { useStaleRecord } from '@/infrastructure/utils/use-stale-record.ts';

vi.mock('@/i18n', () => ({ translate: (key: string) => `t:${key}` }));

/** The reject envelope `onResponseReject` builds for a status. */
const rejection = (status: number) => ({ success: false, status, errors: [] });

/** A blocking-error stand-in that records what the composable asks of it. */
const makeBlocking = () => ({ warn: vi.fn(), clear: vi.fn() });

describe('useStaleRecord', () => {
    it('takes a 412: warns with the translated copy and marks the form stale', () => {
        const blocking = makeBlocking();
        const stale = useStaleRecord(blocking, () => Promise.resolve());

        expect(stale.handle(rejection(412))).toBe(true);

        expect(blocking.warn).toHaveBeenCalledWith('t:generic.error-stale-record');
        expect(stale.isStale.value).toBe(true);
    });

    it.each([[409], [422], [500], [0]])(
        'leaves a %s to the caller: not handled, nothing shown',
        (status) => {
            const blocking = makeBlocking();
            const stale = useStaleRecord(blocking, () => Promise.resolve());

            expect(stale.handle(rejection(status))).toBe(false);

            expect(blocking.warn).not.toHaveBeenCalled();
            expect(stale.isStale.value).toBe(false);
        }
    );

    it('leaves a non-envelope rejection to the caller', () => {
        const stale = useStaleRecord(makeBlocking(), () => Promise.resolve());

        expect(stale.handle(new Error('boom'))).toBe(false);
        expect(stale.handle(undefined)).toBe(false);
    });

    it('reloads: clears the warning first, then re-reads, and is no longer stale', async () => {
        const blocking = makeBlocking();
        const order: string[] = [];
        blocking.clear.mockImplementation(() => order.push('clear'));
        const reload = vi.fn(() => {
            order.push('reload');
            return Promise.resolve('fresh');
        });
        const stale = useStaleRecord(blocking, reload);
        stale.handle(rejection(412));

        await expect(stale.reloadLatest()).resolves.toBe('fresh');

        expect(order).toEqual(['clear', 'reload']);
        expect(stale.isStale.value).toBe(false);
    });

    it('clear() drops the stale flag without touching the record', () => {
        const reload = vi.fn(() => Promise.resolve());
        const stale = useStaleRecord(makeBlocking(), reload);
        stale.handle(rejection(412));

        stale.clear();

        expect(stale.isStale.value).toBe(false);
        expect(reload).not.toHaveBeenCalled();
    });
});
