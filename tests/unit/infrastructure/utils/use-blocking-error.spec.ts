/**
 * The one behavioural difference from `notifyErrorMessages` that matters here — {@link warn}
 * must NOT reach Faro — gets its own assertion, the same way `errors.spec.ts` proves
 * `notifyErrorMessages` DOES. The observability store is stubbed for the same reason that file
 * gives: the real `captureException` is a no-op until Faro connects, so testing against it would
 * pass vacuously whichever way the code was wrong.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';

const captureExceptionMock = vi.fn();
vi.mock('@/infrastructure/observability/store.ts', () => ({
    useObservabilityStore: () => ({ captureException: captureExceptionMock })
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useBlockingError — report()', () => {
    it('sets the message from the caught error', () => {
        const { message, report } = useBlockingError();

        report(new Error('save failed'));

        expect(message.value).toBe('save failed');
    });

    it('sets the type to error', () => {
        const { type, report } = useBlockingError();

        report(new Error('save failed'));

        expect(type.value).toBe('error');
    });

    it('reports the error to Faro', () => {
        const { report } = useBlockingError();
        const error = new Error('save failed');

        report(error);

        expect(captureExceptionMock).toHaveBeenCalledWith(error);
    });
});

describe('useBlockingError — warn()', () => {
    it('sets the message from the given text', () => {
        const { message, warn } = useBlockingError();

        warn('No order matches this reference.');

        expect(message.value).toBe('No order matches this reference.');
    });

    it('sets the type to warning', () => {
        const { type, warn } = useBlockingError();

        warn('No order matches this reference.');

        expect(type.value).toBe('warning');
    });

    it('never reports to Faro — an expected absence is not a failure', () => {
        const { warn } = useBlockingError();

        warn('No order matches this reference.');

        expect(captureExceptionMock).not.toHaveBeenCalled();
    });
});

describe('useBlockingError — clear()', () => {
    it('resets the message to undefined', () => {
        const { message, report, clear } = useBlockingError();
        report(new Error('save failed'));

        clear();

        expect(message.value).toBeUndefined();
    });

    it('is safe to call before anything has failed', () => {
        const { message, clear } = useBlockingError();

        clear();

        expect(message.value).toBeUndefined();
    });
});

describe('useBlockingError — independent instances', () => {
    it('gives each call its own state', () => {
        const first = useBlockingError();
        const second = useBlockingError();

        first.report(new Error('first failed'));

        expect(first.message.value).toBe('first failed');
        expect(second.message.value).toBeUndefined();
    });
});
