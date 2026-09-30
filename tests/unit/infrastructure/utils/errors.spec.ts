import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
    getErrorMessage,
    rethrowUnlessAbsent,
    absentIs,
    isPreconditionFailed,
    isTransportFailure,
    notifyErrorMessages
} from '@/infrastructure/utils/errors.ts';
import { loadLocale } from '@/i18n';
import enMessages from '@/locales/en.json';

/**
 * The "nothing usable in the error" fallback is translated copy now, so the dictionary has to be
 * loaded or every such assertion would compare against a raw key.
 */
beforeAll(() => loadLocale('en'));

/**
 * The observability store is stubbed so the "reported to Faro" half of `notifyErrorMessages`
 * is observable: the real `captureException` is a deliberate no-op until Faro connects, so
 * against the real store every assertion about reporting would pass vacuously.
 */
const captureExceptionMock = vi.fn();
vi.mock('@/infrastructure/observability/store.ts', () => ({
    useObservabilityStore: () => ({ captureException: captureExceptionMock })
}));

describe('notifyErrorMessages', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('shows the error message when it is a string', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, 'email already registered');
        expect(addMessage).toHaveBeenCalledWith('email already registered');
    });

    it('shows the message of an Error instance', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, new Error('network down'));
        expect(addMessage).toHaveBeenCalledWith('network down');
    });

    it('shows the message property of an error-like object', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, { message: 'Forbidden' });
        expect(addMessage).toHaveBeenCalledWith('Forbidden');
    });

    it('falls back to a generic message for unrecognized errors', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, 42);
        expect(addMessage).toHaveBeenCalledWith(enMessages['api-errors'].unknown);
    });

    // The `&& error` / `&& error.message` guards below each exist to stop an *empty* message
    // being shown to a user as if it were an explanation. They are individually invisible in a
    // review and individually easy to drop, so each falsy shape gets its own case.

    it('falls back rather than showing an empty string', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, '');
        expect(addMessage).toHaveBeenCalledWith(enMessages['api-errors'].unknown);
    });

    it('falls back rather than showing an Error with an empty message', () => {
        const addMessage = vi.fn();
        // eslint-disable-next-line unicorn/error-message -- the empty message is the input under test
        notifyErrorMessages(addMessage, new Error(''));
        expect(addMessage).toHaveBeenCalledWith(enMessages['api-errors'].unknown);
    });

    it('falls back rather than showing an error-like object with an empty message', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, { message: '' });
        expect(addMessage).toHaveBeenCalledWith(enMessages['api-errors'].unknown);
    });

    it('falls back when the message property is not a string', () => {
        // e.g. a parsed API body whose `message` is an array of validation errors — rendering
        // that raw would put "[object Object]" in front of a user.
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, { message: { nested: true } });
        expect(addMessage).toHaveBeenCalledWith(enMessages['api-errors'].unknown);
    });

    it('falls back for null without throwing', () => {
        // `typeof null === 'object'`, so the `error &&` guard is the only thing preventing a
        // TypeError here — and `null` is what an empty rejected body deserialises to.
        const addMessage = vi.fn();
        expect(() => notifyErrorMessages(addMessage, null)).not.toThrow();
        expect(addMessage).toHaveBeenCalledWith(enMessages['api-errors'].unknown);
    });

    it('reports the original value to observability, not the derived message', () => {
        // The user gets a readable string; telemetry must get the real thing, stack included,
        // or the report is worthless for debugging.
        const error = new Error('network down');

        notifyErrorMessages(vi.fn(), error);

        expect(captureExceptionMock).toHaveBeenCalledWith(error);
    });

    it('reports even when the message could not be derived', () => {
        // The fallback path is the one where telemetry matters most: nobody can act on
        // "Unknown error" without the underlying value.
        notifyErrorMessages(vi.fn(), 42);

        expect(captureExceptionMock).toHaveBeenCalledWith(42);
    });
});

/**
 * The classifier that decides what reaches analytics. Both repos write into ONE Umami website, so
 * anything the server answered is already recorded there — reporting it again from the browser
 * stores one refusal as two rows nothing can tell apart. "No answer at all" is the only case this
 * side owns.
 */
describe('isTransportFailure', () => {
    it.each([
        ['a dropped connection with no envelope', undefined],
        ['null', null],
        ['a bare string', 'Network Error'],
        ['a number', 0],
        ['an envelope with no status', { message: 'boom' }],
        ['an envelope whose status is a string', { status: '500' }],
        ['an envelope whose status is null', { status: null }]
    ])('reports %s as a transport failure', (_case, error) => {
        expect(isTransportFailure(error)).toBe(true);
    });

    it.each([400, 401, 404, 422, 500, 503])(
        'reports an answered %i as NOT a transport failure',
        (status) => {
            expect(isTransportFailure({ status })).toBe(false);
        }
    );

    /**
     * `onResponseReject` (`http/interceptors.ts`) writes `status: 0` for exactly this case —
     * offline, a timeout, CORS, a cancel — never for an answered request. A numeric zero has to
     * read as a transport failure and not as a real status: every rejection this app produces
     * already carries a number, so a classifier that only checked "is `status` present" could
     * never report `true` for one.
     */
    it('treats a numeric zero status as a transport failure, not an answer', () => {
        expect(isTransportFailure({ status: 0 })).toBe(true);
    });
});

/**
 * The "nothing there" test. `GET /payments/by-order/:id` answering 404 means "no intent yet";
 * every other status is a failure the caller must not render as absence.
 */
describe('absentIs', () => {
    it('accepts the status the caller named', () => {
        expect(absentIs({ status: 404 }, 404)).toBe(true);
    });

    it('accepts any of several named statuses', () => {
        expect(absentIs({ status: 401 }, 404, 401)).toBe(true);
    });

    it('rejects a status the caller did not name', () => {
        expect(absentIs({ status: 500 }, 404)).toBe(false);
    });

    /**
     * The load-bearing half: a dropped connection must never read as "nothing there", or an
     * outage renders as an empty cart instead of an error.
     */
    it.each([undefined, null, 'Network Error', { message: 'boom' }])(
        'rejects the transport failure %o however the statuses are named',
        (error) => {
            expect(absentIs(error, 404, 401)).toBe(false);
        }
    );

    it('rejects everything when no status is named at all', () => {
        expect(absentIs({ status: 404 })).toBe(false);
    });
});

/**
 * The step the three stores actually call. Its value is the `throw`: a store that swallowed a
 * 500 would render "nothing shipped yet" over an outage, so the rethrow is asserted as
 * carefully as the absence.
 */
describe('rethrowUnlessAbsent', () => {
    it('returns quietly for a status that means absence', () => {
        expect(() => rethrowUnlessAbsent({ status: 404 }, 404)).not.toThrow();
    });

    it('returns quietly for any of several named statuses', () => {
        expect(() => rethrowUnlessAbsent({ status: 401 }, 404, 401)).not.toThrow();
    });

    it('rethrows the original value, unchanged, for any other status', () => {
        const error = { status: 500, message: 'boom' };
        expect(() => rethrowUnlessAbsent(error, 404)).toThrow(error);
    });

    it('rethrows a transport failure rather than reading it as absence', () => {
        const error = { message: 'Network Error' };
        expect(() => rethrowUnlessAbsent(error, 404)).toThrow(error);
    });
});

/**
 * `isPreconditionFailed` — the 412 an edit form answers with "reload", never with a resend. It must
 * not be fooled by a dropped connection (nothing was decided) or by another 4xx.
 */
describe('isPreconditionFailed', () => {
    it('is true for the API answering 412', () => {
        expect(isPreconditionFailed({ status: 412 })).toBe(true);
    });

    it.each([{ status: 409 }, { status: 422 }, { status: 500 }, { status: 0 }])(
        'is false for %o',
        (error) => {
            expect(isPreconditionFailed(error)).toBe(false);
        }
    );

    it.each([undefined, null, 'Network Error', { message: 'boom' }])(
        'is false for the transport failure %o',
        (error) => {
            expect(isPreconditionFailed(error)).toBe(false);
        }
    );
});

describe('getErrorMessage', () => {
    it("prefers the API's own sentence over the envelope's HTTP phrase", () => {
        expect(
            getErrorMessage({
                status: 422,
                message: 'Unprocessable Entity',
                errors: [{ code: 'VALIDATION', message: 'The password is incorrect.' }]
            })
        ).toBe('The password is incorrect.');
    });

    it('reads the first item when several are sent', () => {
        expect(
            getErrorMessage({
                message: 'Bad Request',
                errors: [{ message: 'one' }, { message: 'two' }]
            })
        ).toBe('one');
    });

    it.each([
        ['no errors', { message: 'Forbidden' }],
        ['an empty errors list', { message: 'Forbidden', errors: [] }],
        ['an item with no message', { message: 'Forbidden', errors: [{ code: 'X' }] }],
        ['an item with an empty message', { message: 'Forbidden', errors: [{ message: '' }] }],
        ['an item that is not an object', { message: 'Forbidden', errors: ['text'] }],
        ['errors that is not a list', { message: 'Forbidden', errors: 'oops' }]
    ])('falls back to the envelope message when it carries %s', (_name, error) => {
        expect(getErrorMessage(error)).toBe('Forbidden');
    });

    it('falls back to the generic wording when nothing is readable', () => {
        expect(getErrorMessage({ errors: [] })).toBe(enMessages['api-errors'].unknown);
    });
});
