import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';

describe('notifyErrorMessages', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
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

    it('does nothing when there is no matching field', () => {
        const form = document.createElement('form');
        expect(() => focusFirstErrorField(form)).not.toThrow();
    });
});
