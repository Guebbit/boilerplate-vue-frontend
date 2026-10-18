/**
 * @module
 * The connected-accounts panel: one row per linked provider with its label and date, an empty
 * state, and a removal that asks first and only then calls the store.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ProfileConnectedAccounts from '../components/ProfileConnectedAccounts.vue';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** The mocked store's removal action. */
const unlinkProvider = vi.fn();

/** The mocked store's connect action: answers the consent URL. */
const startLink = vi.fn();

/** The providers the deployment offers, as the mocked providers store lists them. */
let offered: string[] = [];

/** What the mocked store currently lists. */
let links: { provider: string; connectedAt: string }[] = [];

vi.mock('../stores/oauth-links.ts', () => ({
    useOAuthLinksStore: () => ({
        links,
        fetchLinks: vi.fn(),
        unlinkProvider
    }),
    startProviderLink: (provider: string, options: unknown) =>
        startLink(provider, options) as Promise<string>
}));

vi.mock('../stores/oauth.ts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../stores/oauth.ts')>()),
    useOAuthProvidersStore: () => ({ providers: offered, fetchProviders: vi.fn() })
}));

// The store above is a plain object, not a real Pinia store — an identity `storeToRefs` is enough.
vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal<typeof import('pinia')>()),
    storeToRefs: (store: unknown) => store
}));

/** Mounts the panel with the plugins it needs. */
const mountPanel = () =>
    mount(ProfileConnectedAccounts, { global: { plugins: [createPinia(), vuetify, i18n] } });

beforeEach(() => {
    vi.clearAllMocks();
    links = [{ provider: 'github', connectedAt: '2026-01-01T00:00:00.000Z' }];
    offered = [];
    return loadLocale('en');
});

describe('ProfileConnectedAccounts', () => {
    it('labels each provider the way the login buttons do', () => {
        const wrapper = mountPanel();

        expect(wrapper.find('[data-test="connected-item"]').text()).toContain('GitHub');
    });

    it('says so when nothing is connected', () => {
        links = [];

        expect(mountPanel().find('[data-test="connected-empty"]').exists()).toBe(true);
    });

    it('does nothing when the confirmation is declined', () => {
        unlinkProvider.mockResolvedValue([]);
        const wrapper = mountPanel();
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);

        return wrapper
            .get('[data-test="connected-remove"]')
            .trigger('click')
            .then(() => flushPromises())
            .then(() => {
                expect(unlinkProvider).not.toHaveBeenCalled();
            });
    });

    it('removes the provider once the confirmation is accepted', () => {
        unlinkProvider.mockResolvedValue([]);
        const wrapper = mountPanel();
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);

        return wrapper
            .get('[data-test="connected-remove"]')
            .trigger('click')
            .then(() => vi.waitFor(() => expect(unlinkProvider).toHaveBeenCalledWith('github')));
    });
});

describe('ProfileConnectedAccounts — connecting a provider', () => {
    it('offers only the providers this deployment has that are not connected yet', async () => {
        offered = ['google', 'github'];
        const wrapper = mountPanel();
        await flushPromises();

        expect(wrapper.find('[data-test=connected-connect-github]').exists()).toBe(false);
        expect(wrapper.get('[data-test=connected-connect-google]').text()).toBe('Connect Google');
    });

    it('asks the server for the consent URL, with the page to come back to, and leaves for it', async () => {
        offered = ['google'];
        startLink.mockResolvedValue('https://accounts.example/consent?state=x');
        const assign = vi.fn();
        vi.stubGlobal('location', { pathname: '/en/profile', assign });
        const wrapper = mountPanel();
        await flushPromises();

        await wrapper.get('[data-test=connected-connect-google]').trigger('click');
        await flushPromises();

        expect(startLink).toHaveBeenCalledWith('google', {
            continueTo: '/en/profile',
            locale: 'en'
        });
        expect(assign).toHaveBeenCalledWith('https://accounts.example/consent?state=x');
        vi.unstubAllGlobals();
    });

    it('shows the refusal in place and stays on the page when the server says no', async () => {
        offered = ['google'];
        startLink.mockRejectedValue(
            Object.assign(new Error('refused'), {
                status: 404,
                errors: [{ message: 'No such provider.' }]
            })
        );
        const assign = vi.fn();
        vi.stubGlobal('location', { pathname: '/en/profile', assign });
        const wrapper = mountPanel();
        await flushPromises();

        await wrapper.get('[data-test=connected-connect-google]').trigger('click');
        await flushPromises();

        expect(assign).not.toHaveBeenCalled();
        expect(wrapper.get('[data-test=connected-action-error]').text()).toContain(
            'No such provider.'
        );
        vi.unstubAllGlobals();
    });
});
