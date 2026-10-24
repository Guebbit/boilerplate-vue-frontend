/**
 * @module
 * The account-deletion request mails a link, so the API refuses it with a 429 once the mailbox's
 * daily budget is spent. The panel shows the API's own sentence in place, next to the button.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
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

describe('requesting the account deletion when the mailbox budget is spent', () => {
    it('shows the 429 sentence in place of the success toast', async () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        vi.spyOn(useProfileStore(), 'requestAccountDelete').mockRejectedValue({
            status: 429,
            errors: [{ code: 'RATE_LIMITED', message: 'Too many requests, try again later.' }]
        });
        const wrapper = mount(ProfileDeleteAccount, { global: { plugins: [vuetify, i18n] } });

        await wrapper.get('button').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test=profile-delete-account-error]').text()).toContain(
            'Too many requests, try again later.'
        );
    });
});
