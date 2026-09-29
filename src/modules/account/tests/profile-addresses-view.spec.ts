/**
 * @module
 * `ProfileAddresses.vue`'s own save logic — scoped to what the store test
 * (`addresses.spec.ts`) does not cover: the create/update payload the component itself builds
 * from the dialog's fields. B4 (AUDIT_0924 D17c follow-through): emptying label or phone on an
 * EDIT must send `null` so the PATCH actually clears the field, not `''` (a 422 under D17c) nor
 * an omitted key (a PATCH no-op that leaves the old value in place).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProfileAddresses from '@/modules/account/components/ProfileAddresses.vue';
import { useAddressesStore } from '@/modules/account/stores/addresses.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { contractRequest } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

const OFFICE = {
    id: 'a1',
    label: 'office',
    fullName: 'Ada Lovelace',
    street: '2 Side St',
    city: 'Shelbyville',
    zip: '22222',
    country: 'US',
    phone: '555-1234',
    default: false
};

/**
 * Stands in for the country `v-autocomplete` as a plain text input — same reasoning as
 * `record-offline-payment-form.spec.ts`'s own `VSelect` stub, an `<input>` rather than a
 * `<select>` specifically so it stays inside `dialogInputs`' positional `findAll('input')` at the
 * SAME index the real field held before E12 turned it from a `v-text-field` into a select.
 */
const V_COUNTRY_SELECT_STUB = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
        '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
};

/**
 * Mounts the panel with the store pre-seeded (no fetch involved) and `updateAddress`/`addAddress`
 * spied, so each case only has to assert on the payload sent.
 */
const mountPanel = () => {
    const store = useAddressesStore();
    store.addresses = [OFFICE];
    // Fire-and-forget in the component; stubbed so the real transport is never hit.
    vi.spyOn(store, 'fetchAddresses').mockResolvedValue([OFFICE]);
    const updateAddress = vi.spyOn(store, 'updateAddress').mockResolvedValue([OFFICE]);
    const addAddress = vi.spyOn(store, 'addAddress').mockResolvedValue([OFFICE]);
    const wrapper = mount(ProfileAddresses, {
        global: {
            plugins: [vuetify, i18n],
            stubs: {
                // The confirmation gate under test is not the overlay Vuetify manages — same
                // reasoning as `EntriesImportDialog.spec.ts`.
                VDialog: { template: '<div><slot /></div>' },
                VAutocomplete: V_COUNTRY_SELECT_STUB
            }
        }
    });
    return { wrapper, updateAddress, addAddress };
};

/**
 * The dialog's inputs in template order: label, fullName, street, zip, city, country, phone —
 * the same order the e2e spec (`tests/e2e/profile.cy.ts`) indexes by, since none but `phone`
 * carries a `data-test` of its own.
 */
const dialogInputs = (wrapper: ReturnType<typeof mountPanel>['wrapper']) =>
    wrapper.get('[data-test=address-dialog]').findAll('input');

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ProfileAddresses save payload', () => {
    it('sends null for an emptied label and phone on an edit, not "" or an omitted key', () => {
        const { wrapper, updateAddress } = mountPanel();

        return wrapper
            .get('[data-test=address-edit]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                const inputs = dialogInputs(wrapper);
                return inputs[0].setValue('').then(() => inputs[6].setValue(''));
            })
            .then(() => wrapper.get('[data-test=address-dialog] form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(updateAddress).toHaveBeenCalledTimes(1);
                const [id, body] = updateAddress.mock.calls[0];
                expect(id).toBe('a1');
                expect(contractRequest(schemas.UpdateAddressBody, body)).toEqual({
                    label: null,
                    phone: null
                });
            });
    });

    it('omits label and phone on a create, rather than sending null', () => {
        const { wrapper, addAddress } = mountPanel();

        return wrapper
            .get('[data-test=address-add]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                const inputs = dialogInputs(wrapper);
                return inputs[1]
                    .setValue('Ada Lovelace')
                    .then(() => inputs[2].setValue('1 Main St'))
                    .then(() => inputs[3].setValue('11111'))
                    .then(() => inputs[4].setValue('Springfield'))
                    .then(() => inputs[5].setValue('US'));
            })
            .then(() => wrapper.get('[data-test=address-dialog] form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(addAddress).toHaveBeenCalledTimes(1);
                const body = contractRequest(schemas.AddAddressBody, addAddress.mock.calls[0][0]);
                expect(body).not.toHaveProperty('label');
                expect(body).not.toHaveProperty('phone');
            });
    });
});
