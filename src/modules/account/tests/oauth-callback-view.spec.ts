/**
 * @module
 * The OAuth landing page: a signed-in account that just connected a provider is told so and sent
 * back where it was, and each refusal the backend can redirect with has its own words. The router
 * and the post-login redirect are stubbed; this proves what the page decides, not the navigation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OAuthCallback from '../views/OAuthCallback.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** The query the mocked route currently carries. */
let query: Record<string, string> = {};

/** The post-login redirect, spied. */
const redirectAfterLogin = vi.fn();

/** Toasts the page raised. */
const addMessage = vi.fn();

vi.mock('vue-router', () => ({
    useRoute: () => ({ query }),
    useRouter: () => ({ push: vi.fn() }),
    RouterLink: { template: '<a><slot /></a>' }
}));

vi.mock('../composables/use-post-login-redirect.ts', () => ({
    usePostLoginRedirect: () => ({ redirectAfterLogin })
}));

vi.mock('@guebbit/vue-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/vue-toolkit')>()),
    useNotificationsStore: () => ({ addMessage })
}));

/** Mounts the landing page for the current {@link query}. */
const mountPage = () => mount(OAuthCallback, { global: { plugins: [vuetify, i18n] } });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    query = {};
    return loadLocale('en');
});

describe('OAuthCallback — a connected provider', () => {
    it('toasts that the provider is connected and goes back where the visitor was', async () => {
        query = { linked: 'google', continue: '/en/profile' };

        mountPage();
        await flushPromises();

        expect(addMessage).toHaveBeenCalledWith(
            'Google is connected. You can now sign in with it.'
        );
        expect(redirectAfterLogin).toHaveBeenCalledOnce();
    });
});

describe('OAuthCallback — the refusals', () => {
    it.each([
        ['account_exists', 'connect this provider from your profile'],
        ['already_linked', 'already connected to another account'],
        ['link_expired', 'took too long or was already used']
    ])('explains %s in its own words and does not leave the page', async (code, words) => {
        query = { error: code };

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.text()).toContain(words);
        expect(redirectAfterLogin).not.toHaveBeenCalled();
    });
});
