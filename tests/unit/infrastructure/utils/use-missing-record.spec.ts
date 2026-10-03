/**
 * A record page that gets "not there" or "not yours" from the API leaves for the Error page; any
 * other failure is a toast, and the page stays. The router and the toast store are stubbed, so the
 * only thing under test is which of the two a status picks.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';

/** Stub for the router's `replace`. */
const replaceMock = vi.fn(() => Promise.resolve());

/** Stub for the toast dispatcher. */
const addMessageMock = vi.fn();

/** Stub for the observability store's `captureException`. */
const captureExceptionMock = vi.fn();

vi.mock('vue-router', () => ({
    useRouter: () => ({
        replace: replaceMock,
        currentRoute: { value: { params: { locale: 'it' } } }
    })
}));
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

describe('useMissingRecord', () => {
    it('sends a 404 to the Error page, in the visitor locale, replacing the dead entry', () => {
        useMissingRecord()({ status: 404 });

        expect(replaceMock).toHaveBeenCalledWith({
            name: 'Error',
            params: { locale: 'it', status: 404, message: 'error-page.not-found' }
        });
        expect(addMessageMock).not.toHaveBeenCalled();
    });

    it('sends a 403 to the Error page with the forbidden wording', () => {
        useMissingRecord()({ status: 403 });

        expect(replaceMock).toHaveBeenCalledWith({
            name: 'Error',
            params: { locale: 'it', status: 403, message: 'navigation.error-forbidden' }
        });
    });

    it('toasts and reports any other answer, and stays on the page', () => {
        const error = { status: 500, errors: [{ message: 'boom' }] };

        useMissingRecord()(error);

        expect(replaceMock).not.toHaveBeenCalled();
        expect(addMessageMock).toHaveBeenCalledWith('boom');
        expect(captureExceptionMock).toHaveBeenCalledWith(error);
    });

    it('toasts a failure that never got an answer', () => {
        useMissingRecord()(new Error('offline'));

        expect(replaceMock).not.toHaveBeenCalled();
        expect(addMessageMock).toHaveBeenCalled();
    });
});
