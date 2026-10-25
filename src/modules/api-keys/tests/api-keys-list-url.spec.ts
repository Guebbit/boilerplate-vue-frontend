/**
 * @module
 * The credentials list keeps its page and page size in the URL: a link that names them opens the
 * list there, and the first read already asks for them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { listApiKeys } from '@api';
import ApiKeysList from '../views/ApiKeysList.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** Stub for the list call: an empty page, nothing else. */
vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    listApiKeys: vi.fn(() =>
        Promise.resolve({ items: [], meta: { totalItems: 0 }, maxExpiresAt: undefined })
    )
}));

/** The real route tree, so the list's links resolve. */
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

describe('ApiKeysList URL state', () => {
    it('reads the page and page size its link names', () => {
        return router
            .push('/en/api-keys?page=2&pageSize=20')
            .then(() => {
                mount(ApiKeysList, { global: { plugins: [router, vuetify, i18n] } });
                return flushPromises();
            })
            .then(() => {
                expect(listApiKeys).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
            });
    });
});
