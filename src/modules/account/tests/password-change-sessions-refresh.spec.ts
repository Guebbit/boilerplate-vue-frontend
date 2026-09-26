/**
 * a live password change revokes every OTHER session server-side
 * (`postPasswordChange`, backend), so the device-sessions panel must refetch once the change
 * succeeds — otherwise it goes on showing sessions that no longer exist until its own next visit.
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ProfilePasswordChange from '@/modules/account/components/ProfilePasswordChange.vue';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';

const changePassword = vi.fn(() => Promise.resolve());
const fetchSessions = vi.fn();

vi.mock('@/modules/account/stores/profile.ts', () => ({
    useProfileStore: () => ({ changePassword })
}));

vi.mock('@/modules/account/stores/sessions.ts', () => ({
    useAccountSessionsStore: () => ({ fetchSessions })
}));

const NEW_PASSWORD = 'Passw0rd!';

const mountForm = () =>
    mount(ProfilePasswordChange, { global: { plugins: [createPinia(), vuetify, i18n] } });

/**
 * Toggles the form open, fills every field, and submits — the shape a real visitor would drive
 * it in.
 */
const submitValidChange = async () => {
    const wrapper = mountForm();
    await wrapper.find('[data-test="toggle-change-password"]').trigger('click');
    await wrapper.find('[data-test="current-password"] input').setValue('current-password-1');
    await wrapper.find('[data-test="new-password"] input').setValue(NEW_PASSWORD);
    await wrapper.find('[data-test="new-password-confirm"] input').setValue(NEW_PASSWORD);
    await wrapper.find('form').trigger('submit.prevent');
    await flushAll();
    return wrapper;
};

/** A few microtask/timer ticks — the debounced breach check and the submit chain both need one. */
const flushAll = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('a successful password change', () => {
    it('refetches the device-sessions list', async () => {
        await loadLocale('en');
        await submitValidChange();

        expect(changePassword).toHaveBeenCalledWith(
            'current-password-1',
            NEW_PASSWORD,
            NEW_PASSWORD
        );
        expect(fetchSessions).toHaveBeenCalledOnce();
    });
});
