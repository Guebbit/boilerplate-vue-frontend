/**
 * @module
 * The restore offer page: it names the erasure date, restores through the store and lands where a
 * plain login would, lets the visitor walk away, shows a refused claim check in place, and sends a
 * visitor with no offer back to `Login`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AccountRestoreChallenge from '../views/AccountRestoreChallenge.vue';
import { useDeletionRestoreStore } from '../stores/deletion-restore.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** The router's `push` and `replace`, shared so a case can see where the page sent the visitor. */
const { push, replace, redirectAfterLogin } = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    redirectAfterLogin: vi.fn()
}));

vi.mock('vue-router', () => ({
    useRoute: () => ({ query: {} }),
    useRouter: () => ({ push, replace })
}));

vi.mock('../composables/use-post-login-redirect.ts', () => ({
    usePostLoginRedirect: () => ({ redirectAfterLogin })
}));

/** Mounts the page with an offer open, unless `offer` is false. */
const mountPage = (offer = true) => {
    if (offer)
        useDeletionRestoreStore().beginOAuth({
            purgeAt: '2026-11-23T00:00:00.000Z',
            expiresAt: '2026-10-24T10:05:00.000Z'
        });
    return mount(AccountRestoreChallenge, { global: { plugins: [vuetify, i18n] } });
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    push.mockResolvedValue(undefined);
    redirectAfterLogin.mockResolvedValue(undefined);
    return loadLocale('en');
});

describe('AccountRestoreChallenge', () => {
    it('names the day the account is erased', () => {
        const wrapper = mountPage();

        expect(wrapper.text()).toContain('2026');
        expect(wrapper.text()).toContain('scheduled for deletion');
    });

    it('restores through the store and lands where a plain login would', async () => {
        const wrapper = mountPage();
        const restore = vi.spyOn(useDeletionRestoreStore(), 'restoreAndSignIn').mockResolvedValue();

        await wrapper.get('[data-test=account-restore-challenge-restore]').trigger('click');
        await flushPromises();

        expect(restore).toHaveBeenCalledOnce();
        expect(redirectAfterLogin).toHaveBeenCalledOnce();
    });

    it('shows a refused claim check in place and does not navigate', async () => {
        const wrapper = mountPage();
        vi.spyOn(useDeletionRestoreStore(), 'restoreAndSignIn').mockRejectedValue({
            status: 401,
            errors: [{ code: 'UNAUTHORIZED', message: 'This restore attempt has expired.' }]
        });

        await wrapper.get('[data-test=account-restore-challenge-restore]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test=account-restore-challenge-error]').text()).toContain(
            'expired'
        );
        expect(redirectAfterLogin).not.toHaveBeenCalled();
    });

    it('lets the visitor leave it deleted: the offer is dropped and they go Home', async () => {
        const wrapper = mountPage();

        await wrapper.get('[data-test=account-restore-challenge-leave]').trigger('click');
        await flushPromises();

        expect(useDeletionRestoreStore().pending).toBeUndefined();
        expect(push).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Home' }));
    });

    it('goes back to Login when there is no offer to answer', async () => {
        mountPage(false);
        await flushPromises();

        expect(replace).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Login' }));
    });
});
