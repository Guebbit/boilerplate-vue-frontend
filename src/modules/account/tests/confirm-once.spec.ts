/**
 * @module
 * The account panels that ask before they write: a second press made before the first answer
 * must not ask again or write again. Each case presses twice in the same tick, answers "yes",
 * and counts the writes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ProfileAddresses from '../components/ProfileAddresses.vue';
import ProfileDeleteAccount from '../components/ProfileDeleteAccount.vue';
import ProfileSessions from '../components/ProfileSessions.vue';
import { useAddressesStore } from '../stores/addresses.ts';
import { useAuthStore } from '../stores/auth.ts';
import { useAccountSessionsStore } from '../stores/sessions.ts';
import { useProfileStore } from '../stores/profile.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { DOMWrapper } from '@vue/test-utils';

wireModulesIntoCore();

/** An address entry to remove. */
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

/** A router with no routes: the panels only need an instance to navigate with. */
const router = createRouter({ history: createMemoryHistory(), routes: [] });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

/**
 * Presses a trigger twice in the same tick, with the dialog answering "yes", and waits for the
 * work to settle.
 *
 * @param button - The trigger to press.
 * @returns How many times the dialog was asked.
 */
const pressTwice = (button: Pick<DOMWrapper<Element>, 'trigger'>) => {
    const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
    return Promise.all([button.trigger('click'), button.trigger('click')])
        .then(() => flushPromises())
        .then(() => confirm);
};

describe('a double press on a confirm-then-write control in the account panels', () => {
    it('removes an address once', async () => {
        const store = useAddressesStore();
        store.addresses = [OFFICE];
        vi.spyOn(store, 'fetchAddresses').mockResolvedValue([OFFICE]);
        const remove = vi.spyOn(store, 'removeAddress').mockResolvedValue([]);
        const wrapper = mount(ProfileAddresses, { global: { plugins: [vuetify, i18n] } });

        const confirm = await pressTwice(wrapper.get('[data-test=address-remove]'));

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it('requests the account deletion once', async () => {
        const request = vi
            .spyOn(useProfileStore(), 'requestAccountDelete')
            .mockResolvedValue(undefined);
        const wrapper = mount(ProfileDeleteAccount, {
            global: { plugins: [router, vuetify, i18n] }
        });

        const confirm = await pressTwice(wrapper.get('button'));

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('logs out everywhere once', async () => {
        vi.spyOn(useAccountSessionsStore(), 'fetchSessions').mockResolvedValue([]);
        const logout = vi.spyOn(useAuthStore(), 'logoutEverywhere').mockResolvedValue(undefined);
        const wrapper = mount(ProfileSessions, {
            global: { plugins: [router, vuetify, i18n] }
        });

        const confirm = await pressTwice(wrapper.get('[data-test=sessions-logout-everywhere]'));

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(logout).toHaveBeenCalledTimes(1);
    });
});
