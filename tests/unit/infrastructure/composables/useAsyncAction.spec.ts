import { describe, expect, it, vi } from 'vitest';
import { useAsyncAction } from '@/infrastructure/composables/useAsyncAction.ts';

/**
 * A promise the test resolves or rejects by hand, so two calls can be interleaved deliberately.
 */
const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

describe('useAsyncAction', () => {
    describe('initial state', () => {
        it('starts idle, with no data and no error', () => {
            const { data, error, loading } = useAsyncAction(() => Promise.resolve('x'));
            expect(data.value).toBeUndefined();
            expect(error.value).toBeUndefined();
            expect(loading.value).toBe(false);
        });

        it('honours initialData', () => {
            const { data } = useAsyncAction(() => Promise.resolve(1), { initialData: 42 });
            expect(data.value).toBe(42);
        });
    });

    describe('run', () => {
        it('stores the payload and resolves with it', async () => {
            const { data, run } = useAsyncAction(() => Promise.resolve({ ok: true }));
            await expect(run()).resolves.toEqual({ ok: true });
            expect(data.value).toEqual({ ok: true });
        });

        it('is loading while in flight and idle afterwards', async () => {
            const { promise, resolve } = deferred<string>();
            const { loading, run } = useAsyncAction(() => promise);

            const pending = run();
            expect(loading.value).toBe(true);

            resolve('done');
            await pending;
            expect(loading.value).toBe(false);
        });

        it('forwards its arguments to the action', async () => {
            const action = vi.fn().mockResolvedValue('x');
            const { run } = useAsyncAction((a: string, b: number) => action(a, b));
            await run('q', 3);
            expect(action).toHaveBeenCalledWith('q', 3);
        });
    });

    describe('failure', () => {
        it('never rejects, so one dead call cannot blank a dashboard', async () => {
            const { error, run } = useAsyncAction(() => Promise.reject(new Error('boom')));
            await expect(run()).resolves.toBeUndefined();
            expect(error.value).toBe('boom');
        });

        it('falls back to the supplied message for a non-Error rejection', async () => {
            const { error, run } = useAsyncAction(() => Promise.reject('just a string'), {
                fallbackErrorMessage: 'Failed to load health data'
            });
            await run();
            expect(error.value).toBe('Failed to load health data');
        });

        it('clears a previous error when a later run succeeds', async () => {
            const action = vi
                .fn()
                .mockRejectedValueOnce(new Error('boom'))
                .mockResolvedValueOnce('recovered');
            const { data, error, run } = useAsyncAction(() => action());

            await run();
            expect(error.value).toBe('boom');

            await run();
            expect(error.value).toBeUndefined();
            expect(data.value).toBe('recovered');
        });

        it('leaves the last good data in place when a later run fails', async () => {
            const action = vi
                .fn()
                .mockResolvedValueOnce('good')
                .mockRejectedValueOnce(new Error('boom'));
            const { data, error, run } = useAsyncAction(() => action());

            await run();
            await run();

            // Better a stale panel with an error beside it than an empty one
            expect(data.value).toBe('good');
            expect(error.value).toBe('boom');
        });
    });

    describe('overlapping runs', () => {
        it('ignores a slow response that lands after a newer one', async () => {
            const first = deferred<string>();
            const second = deferred<string>();
            const action = vi
                .fn()
                .mockReturnValueOnce(first.promise)
                .mockReturnValueOnce(second.promise);
            const { data, run } = useAsyncAction(() => action() as Promise<string>);

            const slow = run();
            const fast = run();

            second.resolve('newest');
            await fast;
            first.resolve('stale');
            await slow;

            // Double-click Refresh and the first response must not overwrite the second
            expect(data.value).toBe('newest');
        });

        it('does not let an overtaken failure set the error', async () => {
            const first = deferred<string>();
            const second = deferred<string>();
            const action = vi
                .fn()
                .mockReturnValueOnce(first.promise)
                .mockReturnValueOnce(second.promise);
            const { data, error, run } = useAsyncAction(() => action() as Promise<string>);

            const slow = run();
            const fast = run();

            second.resolve('newest');
            await fast;
            first.reject(new Error('stale failure'));
            await slow;

            expect(error.value).toBeUndefined();
            expect(data.value).toBe('newest');
        });

        it('keeps loading true until the newest run settles', async () => {
            const first = deferred<string>();
            const second = deferred<string>();
            const action = vi
                .fn()
                .mockReturnValueOnce(first.promise)
                .mockReturnValueOnce(second.promise);
            const { loading, run } = useAsyncAction(() => action() as Promise<string>);

            const slow = run();
            const fast = run();

            first.resolve('stale');
            await slow;
            // The overtaken call must not clear the flag while its successor is still running
            expect(loading.value).toBe(true);

            second.resolve('newest');
            await fast;
            expect(loading.value).toBe(false);
        });
    });

    describe('reset', () => {
        it('returns to the initial state', async () => {
            const { data, error, loading, run, reset } = useAsyncAction(
                () => Promise.reject(new Error('boom')),
                { initialData: 'seed' }
            );

            await run();
            expect(error.value).toBe('boom');

            reset();
            expect(data.value).toBe('seed');
            expect(error.value).toBeUndefined();
            expect(loading.value).toBe(false);
        });

        it('stops an in-flight run from writing to the state it just cleared', async () => {
            const { promise, resolve } = deferred<string>();
            const { data, run, reset } = useAsyncAction(() => promise);

            const pending = run();
            reset();
            resolve('late');
            await pending;

            expect(data.value).toBeUndefined();
        });
    });
});
