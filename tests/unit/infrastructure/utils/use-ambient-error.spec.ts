/**
 * A fire-and-forget read that fails has no view to put an error in: it toasts, and the real error
 * still reaches the observability store. The toast and observability stores are stubbed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAmbientError } from '@/infrastructure/utils/use-ambient-error.ts';

/** Stub for the toast dispatcher. */
const addMessageMock = vi.fn();

/** Stub for the observability store's `captureException`. */
const captureExceptionMock = vi.fn();

vi.mock('@guebbit/vue-toolkit', () => ({
    useNotificationsStore: () => ({ addMessage: addMessageMock })
}));
vi.mock('@/infrastructure/observability/store.ts', () => ({
    useObservabilityStore: () => ({ captureException: captureExceptionMock })
}));
vi.mock('@/i18n', () => ({ translate: (key: string) => key }));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useAmbientError', () => {
    it('toasts the API message and reports the original error', () => {
        const error = { status: 500, errors: [{ message: 'boom' }] };

        useAmbientError()(error);

        expect(addMessageMock).toHaveBeenCalledWith('boom');
        expect(captureExceptionMock).toHaveBeenCalledWith(error);
    });

    it('toasts a failure that never got an answer', () => {
        useAmbientError()(new Error('offline'));

        expect(addMessageMock).toHaveBeenCalledTimes(1);
    });
});
