/**
 * @module
 * The connected-accounts panel: one row per linked provider with its label and date, an empty
 * state, and a removal that asks first and only then calls the store.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ProfileConnectedAccounts from '@/modules/account/components/ProfileConnectedAccounts.vue';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** The mocked store's removal action. */
const unlinkProvider = vi.fn();

/** What the mocked store currently lists. */
let links: { provider: string; connectedAt: string }[] = [];

vi.mock('@/modules/account/stores/oauth-links.ts', () => ({
    useOAuthLinksStore: () => ({
        links,
        fetchLinks: vi.fn(),
        unlinkProvider
    })
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
