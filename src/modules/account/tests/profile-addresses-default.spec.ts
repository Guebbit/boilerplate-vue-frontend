/**
 * @module
 * Unit tests for the "set as default" checkbox in the add-address dialog (FE_PARITY_0924 A3):
 * hidden on an empty book (the first address is always the default server-side already), hidden
 * again while editing an existing entry, and — when it IS shown and checked — the only field it
 * adds is `default: true`, never `false`. `addresses.spec.ts` covers the store's own PATCH/POST
 * plumbing; this file is scoped to the dialog's own UI decision.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProfileAddresses from '@/modules/account/components/ProfileAddresses.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

/** One saved entry — enough to make the book non-empty. */
const HOME = {
    id: 'a1',
    label: 'home',
    fullName: 'Ada Lovelace',
    street: '1 Main St',
    city: 'Springfield',
    zip: '11111',
    country: 'US',
    default: true
};

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/** The most recent `POST /account/addresses` call's raw body. */
const lastAddCall = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.map((call) => call[0] as { url: string; method?: string; data: unknown })
        .findLast(
            (call) => call.method?.toUpperCase() === 'POST' && call.url === '/account/addresses'
        );

/**
 * Stands in for the country `v-autocomplete` as a plain text input — same reasoning as
 * `record-offline-payment-form.spec.ts`'s own `VSelect` stub, an `<input>` rather than a
 * `<select>` so `fillRequired` below can keep setting it by `autocomplete`, the same as every
 * other field here.
 */
const V_COUNTRY_SELECT_STUB = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
        '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
};

/**
 * Mounts the panel with `v-dialog` stubbed to always render its content, same as
 * `entries-import-dialog.spec.ts` — the checkbox's visibility is the component's own decision,
 * not something Vuetify's overlay should have to be driven open for.
 */
const mountAddresses = () =>
    mount(ProfileAddresses, {
        global: {
            plugins: [vuetify, i18n],
            stubs: {
                VDialog: { template: '<div><slot /></div>' },
                VAutocomplete: V_COUNTRY_SELECT_STUB
            }
        }
    });

/** Fills in the required fields so the add form is valid to submit. */
const fillRequired = (wrapper: ReturnType<typeof mountAddresses>) =>
    wrapper
        .get('[data-test=address-dialog] form input[autocomplete=name]')
        .setValue('Ada Lovelace')
        .then(() =>
            wrapper
                .get('[data-test=address-dialog] form input[autocomplete=street-address]')
                .setValue('1 Main St')
        )
        .then(() =>
            wrapper
                .get('[data-test=address-dialog] form input[autocomplete=address-level2]')
                .setValue('Springfield')
        )
        .then(() =>
            wrapper
                .get('[data-test=address-dialog] form input[autocomplete=postal-code]')
                .setValue('11111')
        )
        .then(() =>
            wrapper
                .get('[data-test=address-dialog] form input[autocomplete=country]')
                .setValue('US')
        );

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = { 'GET /account/addresses': orvalEnvelope({ addresses: [] }) };
    return loadLocale('en');
});

describe('an empty address book', () => {
    it('hides the checkbox — the first address is always the default already', () => {
        const wrapper = mountAddresses();

        return flushPromises()
            .then(() => wrapper.get('[data-test=address-add]').trigger('click'))
            .then(() => {
                expect(wrapper.find('[data-test=address-set-default]').exists()).toBe(false);
            });
    });
});

describe('a book that already holds an address', () => {
    beforeEach(() => {
        responses['GET /account/addresses'] = orvalEnvelope({ addresses: [HOME] });
    });

    it('shows the checkbox on Add, but not on Edit', () => {
        const wrapper = mountAddresses();

        return flushPromises()
            .then(() => wrapper.get('[data-test=address-add]').trigger('click'))
            .then(() => {
                expect(wrapper.find('[data-test=address-set-default]').exists()).toBe(true);
                // Opening the SAME dialog for an existing entry, without closing it in between —
                // the stubbed `v-dialog` renders unconditionally, so the checkbox's visibility is
                // proven purely off `editingId`, exactly what the component's own `v-if` reads.
                return wrapper.get('[data-test=address-edit]').trigger('click');
            })
            .then(() => {
                expect(wrapper.find('[data-test=address-set-default]').exists()).toBe(false);
            });
    });

    it('sends default: true when checked, and no `default` key at all when left unchecked', () => {
        responses['POST /account/addresses'] = orvalEnvelope({
            addresses: [HOME, { ...HOME, id: 'a2' }]
        });
        const wrapper = mountAddresses();

        return flushPromises()
            .then(() => wrapper.get('[data-test=address-add]').trigger('click'))
            .then(() => fillRequired(wrapper))
            .then(() => wrapper.get('[data-test=address-set-default] input').setValue(true))
            .then(() => wrapper.get('[data-test=address-dialog] form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(contractRequest(schemas.AddAddressBody, lastAddCall()?.data)).toMatchObject({
                    default: true
                });
            });
    });

    it('omits `default` entirely when the checkbox is left unchecked', () => {
        responses['POST /account/addresses'] = orvalEnvelope({
            addresses: [HOME, { ...HOME, id: 'a2' }]
        });
        const wrapper = mountAddresses();

        return flushPromises()
            .then(() => wrapper.get('[data-test=address-add]').trigger('click'))
            .then(() => fillRequired(wrapper))
            .then(() => wrapper.get('[data-test=address-dialog] form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                // Never `default: false`: the backend ignores a false value entirely, and this
                // proves the box being unchecked never even puts the key on the wire.
                expect(lastAddCall()?.data).not.toHaveProperty('default');
            });
    });
});
