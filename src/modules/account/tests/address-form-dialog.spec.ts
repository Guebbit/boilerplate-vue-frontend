/**
 * @module
 * `AddressFormDialog.vue`'s country select — scoped to what neither `ProfileAddresses.vue`
 * nor `AddressPicker.vue`'s own suites cover: the options `v-autocomplete` actually renders,
 * narrowed or not. Reads `VAutocomplete`'s own `items` prop rather than driving its overlay open —
 * the same "assert what was passed down" idiom `stock-movement-form.spec.ts` documents for a
 * Vuetify listbox that would otherwise need a real menu interaction to inspect.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AddressFormDialog from '@/modules/account/components/AddressFormDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { ISO_COUNTRY_CODES } from '@/infrastructure/utils/country-codes.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * One option as `VAutocomplete` receives it.
 */
interface CountryOption {
    value: string;
    title: string;
}

/**
 * Mounts the dialog open, `v-dialog` stubbed to always render its content — same reasoning as
 * `profile-addresses-default.spec.ts`'s own stub.
 *
 * @param props - `shipToCountries`, or none for the unrestricted account/admin case.
 * @returns The mounted wrapper.
 */
const mountDialog = (props: Record<string, unknown> = {}) =>
    mount(AddressFormDialog, {
        props: { modelValue: true, ...props },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });

/**
 * The country select's own `items`, off the real `VAutocomplete` instance.
 *
 * @param wrapper - The mounted dialog.
 * @returns The options `VAutocomplete` was handed.
 */
const countryOptions = (wrapper: ReturnType<typeof mountDialog>) =>
    wrapper.getComponent({ name: 'VAutocomplete' }).props('items') as CountryOption[];

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('AddressFormDialog — country select', () => {
    it('offers every ISO 3166-1 country when the caller names no ship-to list (the address book)', () => {
        const options = countryOptions(mountDialog());

        expect(options).toHaveLength(ISO_COUNTRY_CODES.length);
        expect(options.map((option) => option.value)).toEqual(
            expect.arrayContaining(['IT', 'US', 'GB'])
        );
    });

    it('narrows the select to the deployment ship-to list at checkout', () => {
        const options = countryOptions(mountDialog({ shipToCountries: ['IT', 'FR'] }));

        expect(options.map((option) => option.value).toSorted()).toEqual(['FR', 'IT']);
    });

    it('localizes every option label via Intl.DisplayNames', () => {
        const options = countryOptions(mountDialog({ shipToCountries: ['IT'] }));

        expect(options[0]?.title).toBe(new Intl.DisplayNames(['en'], { type: 'region' }).of('IT'));
    });
});
