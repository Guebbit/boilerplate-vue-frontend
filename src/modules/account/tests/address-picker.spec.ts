/**
 * @module
 * `AddressPicker.vue` — scoped to its own logic: the pre-select watcher, which chooses the
 * default (or first) entry whenever the list changes and nothing valid is already chosen, but
 * never overrides a still-valid manual pick.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AddressPicker from '@/modules/account/components/AddressPicker.vue';
import { useAddressesStore } from '@/modules/account/stores/addresses.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Address } from '@types';

wireModulesIntoCore();

const anAddress = (overrides: Partial<Address> = {}): Address => ({
    id: 'a1',
    fullName: 'Ada Lovelace',
    street: 'Analytical Engine Way 1',
    city: 'London',
    zip: 'SW1',
    country: 'GB',
    default: false,
    ...overrides
});

/**
 * Mounts the picker with the address store already seeded, its own fetch stubbed so mounting
 * never races a real request.
 *
 * `defineModel` needs a real two-way binding to observe, which a bare `mount` does not wire up —
 * so this reads the watcher's effect off the emitted event instead of a re-rendered prop.
 *
 * @param addresses - The book to seed before mount.
 * @param modelValue - The chosen entry id, if any.
 */
const mountPicker = (addresses: Address[], modelValue?: string) => {
    const store = useAddressesStore();
    store.addresses = addresses;
    vi.spyOn(store, 'fetchAddresses').mockResolvedValue([]);

    const wrapper = mount(AddressPicker, {
        props: { modelValue },
        global: { plugins: [vuetify, i18n] }
    });
    return { store, wrapper };
};

/**
 * The most recent id the picker settled `addressId` on, read off its last `update:modelValue`
 * emit — `undefined` when the watcher never touched it.
 */
const lastChosen = (wrapper: ReturnType<typeof mount>) => {
    const emitted = wrapper.emitted<[string | undefined]>('update:modelValue');
    return emitted?.at(-1)?.[0];
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('AddressPicker — the pre-select watcher', () => {
    it('pre-selects the default entry when nothing is chosen yet', () => {
        const { wrapper } = mountPicker([
            anAddress({ id: 'a1' }),
            anAddress({ id: 'a2', default: true })
        ]);

        expect(lastChosen(wrapper)).toBe('a2');
    });

    it('falls back to the first entry when none is marked default', () => {
        const { wrapper } = mountPicker([anAddress({ id: 'a1' }), anAddress({ id: 'a2' })]);

        expect(lastChosen(wrapper)).toBe('a1');
    });

    it('keeps a still-valid manual choice rather than overriding it with the default', () => {
        const { wrapper } = mountPicker(
            [anAddress({ id: 'a1', default: true }), anAddress({ id: 'a2' })],
            'a2'
        );

        // Never touched: the manual choice was already valid, so the watcher's guard returns
        // before ever assigning `addressId`.
        expect(lastChosen(wrapper)).toBeUndefined();
    });

    it('falls back once the chosen entry vanishes from the list', () => {
        const { store, wrapper } = mountPicker(
            [anAddress({ id: 'a1' }), anAddress({ id: 'a2', default: true })],
            'a1'
        );
        expect(lastChosen(wrapper)).toBeUndefined();

        // The entry the visitor had picked is gone — deleted from the book elsewhere. The prop
        // itself is not updated (no real two-way binding here), which is exactly what proves the
        // watcher is reading the STORE's list, not a stale local copy of it.
        store.addresses = [anAddress({ id: 'a2', default: true })];

        return wrapper.vm.$nextTick().then(() => {
            expect(lastChosen(wrapper)).toBe('a2');
        });
    });
});
