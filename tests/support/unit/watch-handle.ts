/**
 * @module
 * A stand-in `IWatchHandle` for a spec that replaces a store's `watchTarget`/`watchOne` (`useX`,
 * `watchProduct`, …) with a mock, so the mount under test never sets up a real TanStack watcher.
 * vue-toolkit 5's watchers return `{ stop, refetch, suspense, error }` rather than a bare stop
 * function — one shared factory instead of four specs each hand-rolling the same shape.
 */
import { ref } from 'vue';
import type { IWatchHandle } from '@guebbit/vue-toolkit';

/**
 * A handle whose `stop` is a no-op and whose `refetch`/`suspense` resolve `undefined` — enough to
 * satisfy `IWatchHandle<T | undefined>` without driving a real fetch.
 *
 * @returns The stand-in handle.
 */
export const noopWatchHandle = <T>(): IWatchHandle<T | undefined> => ({
    stop: () => {},
    refetch: () => Promise.resolve(undefined),
    suspense: () => Promise.resolve(undefined),
    error: ref(null)
});
