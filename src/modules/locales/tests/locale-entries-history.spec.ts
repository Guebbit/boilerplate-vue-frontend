/**
 * @module
 * The "History" link on a language's entries page: the audit log filtered on that language (its
 * tag is the record), shown only to a caller who may read the audit log.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import LocaleEntries from '../views/LocaleEntries.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { useSessionStore } from '@/infrastructure/session.ts';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** An empty entries page for either entries read. */
const emptyPage = () => Promise.resolve({ items: [], meta: { totalItems: 0, totalPages: 0 } });

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    listLocaleEntries: vi.fn(() => emptyPage()),
    listAppLocaleEntries: vi.fn(() => emptyPage()),
    listLocales: vi.fn(() => Promise.resolve({ locales: [], default: 'en', fallback: 'en' })),
    listLocaleApps: vi.fn(() => Promise.resolve({ apps: [] }))
}));

/** The real route tree, so the link resolves to the real audit route. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Opens the entries page of the `it` language.
 */
const openEntries = () =>
    router
        .push('/en/locales/it')
        .then(() => router.isReady())
        .then(() => mount(LocaleEntries, { global: { plugins: [router, vuetify, i18n] } }))
        .then((wrapper) => flushPromises().then(() => wrapper));

/**
 * Grants (or withholds) `read:AuditLog`, the ability the link is gated on.
 *
 * @param canReadAuditLog - Whether to hold the ability.
 */
const signIn = (canReadAuditLog: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'operator1', email: 'operator@example.com', role: 'admin' };
    session.setAbilities({
        tenant: canReadAuditLog ? [['read', 'AuditLog']] : [],
        platform: []
    });
};

beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('LocaleEntries history', () => {
    it('links to the audit log filtered on the language tag, for a caller who may read it', () => {
        signIn(true);

        return openEntries().then((wrapper) => {
            expect(wrapper.get('[data-test=locale-history]').attributes('href')).toBe(
                '/en/audit?target=it'
            );
        });
    });

    it('is absent for a caller without read:AuditLog', () => {
        signIn(false);

        return openEntries().then((wrapper) => {
            expect(wrapper.find('[data-test=locale-history]').exists()).toBe(false);
        });
    });
});
