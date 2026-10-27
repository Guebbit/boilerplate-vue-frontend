/**
 * @module
 * The account-deletion panel. A request the API accepts sends the visitor Home with a toast naming
 * the erasure date; one it refuses (a stale session, a server fault) does not navigate away, and
 * the panel shows the API's own sentence in place, next to the button.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';

const { addMessage } = vi.hoisted(() => ({ addMessage: vi.fn() }));

vi.mock('@guebbit/vue-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/vue-toolkit')>()),
    useNotificationsStore: () => ({ addMessage })
}));

import ProfileDeleteAccount from '../components/ProfileDeleteAccount.vue';
import { useProfileStore } from '../stores/profile.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

/**
 * A bare router: the panel only needs one to exist, since a refusal never navigates.
 */
const router = createRouter({ history: createMemoryHistory(), routes: [] });

describe('requesting the account deletion when the API accepts', () => {
    it('goes Home and names the erasure date', async () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        vi.spyOn(useProfileStore(), 'requestAccountDelete').mockResolvedValue({
            requestedAt: '2026-10-24T10:00:00.000Z',
            purgeAt: '2026-11-23T10:00:00.000Z'
        });
        const navigate = vi.spyOn(router, 'push').mockResolvedValue(undefined);
        const wrapper = mount(ProfileDeleteAccount, {
            global: { plugins: [router, vuetify, i18n] }
        });

        await wrapper.get('button').trigger('click');
        await flushPromises();

        expect(navigate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Home' }));
        expect(addMessage).toHaveBeenCalledWith(expect.stringContaining('2026'));
    });
});

describe('requesting the account deletion when the API refuses', () => {
    it('shows the refusal sentence in place of the success toast', async () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        vi.spyOn(useProfileStore(), 'requestAccountDelete').mockRejectedValue({
            status: 500,
            errors: [
                { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong, try again later.' }
            ]
        });
        const wrapper = mount(ProfileDeleteAccount, {
            global: { plugins: [router, vuetify, i18n] }
        });

        await wrapper.get('button').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test=profile-delete-account-error]').text()).toContain(
            'Something went wrong, try again later.'
        );
    });
});
