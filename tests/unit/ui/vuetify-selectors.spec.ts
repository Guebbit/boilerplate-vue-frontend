import { describe, expect, it } from 'vitest';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';

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
