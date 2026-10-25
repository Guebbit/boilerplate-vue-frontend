/**
 * @module
 * The entries screen keeps its text filter, app filter and page in the URL: a link that names them
 * opens the list there, and the first read asks for exactly that.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { listAppLocaleEntries } from '@api';
import LocaleEntries from '../views/LocaleEntries.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
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
    getLocales: vi.fn(() => Promise.resolve({ locales: [], default: 'en', fallback: 'en' })),
    listLocaleApps: vi.fn(() => Promise.resolve({ apps: [] }))
}));

/** The real route tree, so the screen's links resolve. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('LocaleEntries URL state', () => {
    it('reads the app, text and page its link names', () => {
        return router
            .push('/en/locales/it?app=demo-fe&text=ciao&page=2')
            .then(() => {
                mount(LocaleEntries, {
                    global: { plugins: [router, vuetify, i18n], stubs: { RouterLink: true } }
                });
                return flushPromises();
            })
            .then(() => {
                expect(listAppLocaleEntries).toHaveBeenCalledWith(
                    'it',
                    'demo-fe',
                    expect.objectContaining({ page: 2, text: 'ciao' })
                );
            });
    });
});
