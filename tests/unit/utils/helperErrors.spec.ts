import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';

/**
 * The observability store is stubbed so the "reported to Faro" half of `notifyErrorMessages`
 * is observable: the real `captureException` is a deliberate no-op until Faro connects, so
 * against the real store every assertion about reporting would pass vacuously.
 */
const captureExceptionMock = vi.fn();
vi.mock('@/stores/observability', () => ({
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
        expect(addMessage).toHaveBeenCalledWith('Unknown error');
    });

    // The `&& error` / `&& error.message` guards below each exist to stop an *empty* message
    // being shown to a user as if it were an explanation. They are individually invisible in a
    // review and individually easy to drop, so each falsy shape gets its own case.

    it('falls back rather than showing an empty string', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, '');
        expect(addMessage).toHaveBeenCalledWith('Unknown error');
    });

    it('falls back rather than showing an Error with an empty message', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, new Error(''));
        expect(addMessage).toHaveBeenCalledWith('Unknown error');
    });

    it('falls back rather than showing an error-like object with an empty message', () => {
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, { message: '' });
        expect(addMessage).toHaveBeenCalledWith('Unknown error');
    });

    it('falls back when the message property is not a string', () => {
        // e.g. a parsed API body whose `message` is an array of validation errors — rendering
        // that raw would put "[object Object]" in front of a user.
        const addMessage = vi.fn();
        notifyErrorMessages(addMessage, { message: { nested: true } });
        expect(addMessage).toHaveBeenCalledWith('Unknown error');
    });

    it('falls back for null without throwing', () => {
        // `typeof null === 'object'`, so the `error &&` guard is the only thing preventing a
        // TypeError here — and `null` is what an empty rejected body deserialises to.
        const addMessage = vi.fn();
        expect(() => notifyErrorMessages(addMessage, null)).not.toThrow();
        expect(addMessage).toHaveBeenCalledWith('Unknown error');
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

describe('focusFirstErrorField', () => {
    it('focuses the first element matching the error selector', () => {
        const form = document.createElement('form');
        form.innerHTML = '<div class="v-input--error"><input /></div>';
        document.body.append(form);

        focusFirstErrorField(form);

        expect(document.activeElement).toBe(form.querySelector('input'));
        form.remove();
    });

    it('focuses the FIRST invalid field when several are in error', () => {
        // "first invalid field" is the accessibility contract; focusing the last would move the
        // user past the error they need to fix.
        const form = document.createElement('form');
        form.innerHTML =
            '<div class="v-input--error"><input id="first" /></div>' +
            '<div class="v-input--error"><input id="second" /></div>';
        document.body.append(form);

        focusFirstErrorField(form);

        expect((document.activeElement as HTMLElement).id).toBe('first');
        form.remove();
    });

    it('ignores fields that are not in an error state', () => {
        const form = document.createElement('form');
        form.innerHTML =
            '<div><input id="valid" /></div>' +
            '<div class="v-input--error"><input id="invalid" /></div>';
        document.body.append(form);

        focusFirstErrorField(form);

        expect((document.activeElement as HTMLElement).id).toBe('invalid');
        form.remove();
    });

    it('falls back to [tabindex] for controls with no native input', () => {
        // v-select and friends expose no focusable input/textarea/select of their own; without
        // the trailing selector they would be silently unreachable.
        const form = document.createElement('form');
        form.innerHTML = '<div class="v-input--error"><div id="select" tabindex="0"></div></div>';
        document.body.append(form);

        focusFirstErrorField(form);

        expect((document.activeElement as HTMLElement).id).toBe('select');
        form.remove();
    });

    it('honours a custom selector for non-Vuetify markup', () => {
        const form = document.createElement('form');
        form.innerHTML = '<input id="native" aria-invalid="true" />';
        document.body.append(form);

        focusFirstErrorField(form, '[aria-invalid="true"]');

        expect((document.activeElement as HTMLElement).id).toBe('native');
        form.remove();
    });

    it('does nothing when there is no matching field', () => {
        const form = document.createElement('form');
        expect(() => focusFirstErrorField(form)).not.toThrow();
    });

    it('is a no-op for an unmounted template ref', () => {
        // Documented: callers pass a template ref directly, which is undefined before mount.
        expect(() => focusFirstErrorField(undefined)).not.toThrow();
    });
});
