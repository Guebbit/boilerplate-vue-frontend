/**
 * `singleFlight` — the second press while the first is still running is dropped.
 */
import { describe, expect, it, vi } from 'vitest';
import { singleFlight } from '@/infrastructure/utils/single-flight.ts';

/**
 * The release a test replaces once the action starts.
 */
const noop = () => undefined;

describe('singleFlight', () => {
    it('drops a call made while the first is unsettled, and passes the arguments through', async () => {
        let finish: () => void = noop;
        const action = vi.fn(
            (id: string) =>
                new Promise<string>((resolve) => {
                    finish = () => resolve(id);
                })
        );
        const guarded = singleFlight(action);

        const first = guarded('a');
        expect(guarded('b')).toBeUndefined();
        finish();

        await expect(first).resolves.toBe('a');
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('lets the next call through once the first settled, even when it failed', async () => {
        const action = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce('ok');
        const guarded = singleFlight(action);

        await expect(guarded()).rejects.toThrow('boom');
        await expect(guarded()).resolves.toBe('ok');
    });

    it('frees the guard when the action had nothing to run', async () => {
        const action = vi
            .fn<() => Promise<string> | undefined>()
            .mockReturnValueOnce(undefined)
            .mockResolvedValueOnce('ran');
        const guarded = singleFlight(action);

        expect(guarded()).toBeUndefined();
        await expect(guarded()).resolves.toBe('ran');
    });
});
