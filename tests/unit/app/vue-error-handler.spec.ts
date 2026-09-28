/**
 * `vue-error-handler.ts` (FA74) — `app.config.errorHandler`'s own implementation: an error a
 * component's render/setup/watcher throws with nothing downstream to catch it must still reach
 * Faro and tell the visitor something broke, and must never itself throw a second error that
 * replaces the one it is trying to report.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleUncaughtVueError } from '@/app/vue-error-handler';
import { GENERIC_ERROR_KEY } from '@/app/utils/error-messages';

const captureException = vi.fn();
const addMessage = vi.fn();

vi.mock('@/infrastructure/observability/store.ts', () => ({
    useObservabilityStore: () => ({ captureException })
}));

vi.mock('@guebbit/vue-toolkit', () => ({
    useNotificationsStore: () => ({ addMessage })
}));

vi.mock('@/infrastructure/i18n', () => ({
    // Identity, so the assertion below reads the dictionary KEY rather than a translation.
    translate: (key: string) => key
}));

beforeEach(() => vi.clearAllMocks());

describe('handleUncaughtVueError', () => {
    it('reports a thrown Error to Faro as itself', () => {
        const error = new Error('boom');

        handleUncaughtVueError(error, null, 'render function');

        expect(captureException).toHaveBeenCalledWith(error);
    });

    it('wraps a non-Error throw so Faro still gets an Error instance', () => {
        handleUncaughtVueError('a string someone threw', null, 'render function');

        expect(captureException).toHaveBeenCalledWith(expect.any(Error));
    });

    it('toasts the generic error message, never the raw thrown value', () => {
        handleUncaughtVueError(new Error('boom'), null, 'render function');

        expect(addMessage).toHaveBeenCalledWith(GENERIC_ERROR_KEY);
    });

    it('does not throw when neither store is ready yet', () => {
        captureException.mockImplementationOnce(() => {
            throw new Error('pinia not active');
        });

        expect(() => handleUncaughtVueError(new Error('boom'), null, 'setup')).not.toThrow();
    });
});
