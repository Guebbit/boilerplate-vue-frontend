import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { loadLocale } from '@/infrastructure/i18n';
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
 * Renders Vuetify-shaped markup and returns what the selector picks out of it.
 */
const firstMatch = (html: string) => {
    const form = document.createElement('form');
    form.innerHTML = html;
    document.body.append(form);
    const found = form.querySelector<HTMLElement>(VUETIFY_INVALID_FIELD_SELECTOR);
    form.remove();
    return found;
};

describe('VUETIFY_INVALID_FIELD_SELECTOR', () => {
    /**
     * The focusing itself is `useStructureFormValidation`'s, and tested there. What belongs to
     * this repo is the selector: the toolkit's `[aria-invalid="true"]` default does not fit
     * Vuetify, where only the wrapper carries the error state. So these assert what the selector
     * finds in Vuetify-shaped markup, which is what breaks if Vuetify renames a class.
     */
    it('finds the input inside a field in error', () => {
        expect(firstMatch('<div class="v-input--error"><input id="target" /></div>')?.id).toBe(
            'target'
        );
    });

    it('finds the FIRST invalid field when several are in error', () => {
        // "first invalid field" is the accessibility contract; focusing the last would move the
        // user past the error they need to fix.
        expect(
            firstMatch(
                '<div class="v-input--error"><input id="first" /></div>' +
                    '<div class="v-input--error"><input id="second" /></div>'
            )?.id
        ).toBe('first');
    });

    it('ignores fields that are not in an error state', () => {
        expect(
            firstMatch(
                '<div><input id="valid" /></div>' +
                    '<div class="v-input--error"><input id="invalid" /></div>'
            )?.id
        ).toBe('invalid');
    });

    it('falls back to [tabindex] for controls with no native input', () => {
        // v-select and friends expose no focusable input/textarea/select of their own; without
        // the trailing selector they would be silently unreachable.
        expect(
            firstMatch('<div class="v-input--error"><div id="select" tabindex="0"></div></div>')?.id
        ).toBe('select');
    });

    it('covers textarea and select too', () => {
        expect(
            firstMatch('<div class="v-input--error"><textarea id="area"></textarea></div>')?.id
        ).toBe('area');
        expect(
            firstMatch('<div class="v-input--error"><select id="pick"></select></div>')?.id
        ).toBe('pick');
    });

    it('matches nothing when no field is in error', () => {
        expect(firstMatch('<div><input id="valid" /></div>')).toBeNull();
    });
});
