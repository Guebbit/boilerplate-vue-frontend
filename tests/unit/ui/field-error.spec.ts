/**
 * `fieldErrorProps` — one binding for a field's error state. `aria-invalid` is what a screen
 * reader announces and what the toolkit's `revealErrors()` focuses, so it must follow the
 * messages exactly: present with one, absent without.
 */
import { describe, expect, it } from 'vitest';
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';

describe('fieldErrorProps', () => {
    it('marks the field invalid while there is a message', () => {
        expect(fieldErrorProps(['Required'])).toEqual({
            'error-messages': ['Required'],
            'aria-invalid': 'true'
        });
        expect(fieldErrorProps('Required')['aria-invalid']).toBe('true');
    });

    it('leaves the field unmarked when the list is empty or absent', () => {
        expect(fieldErrorProps([])['aria-invalid']).toBeUndefined();
        expect(fieldErrorProps(undefined)).toEqual({
            'error-messages': [],
            'aria-invalid': undefined
        });
    });
});
