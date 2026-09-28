/**
 * @module
 * LOCALES_OPTIONAL_0925 step 6b, over the real form: with `GET /locales` failing (the paired
 * backend's `locales` module uninstalled, or genuinely unreachable), the create form must still
 * render — one fallback-language tab — instead of the skeleton `openTags.length === 0` shows
 * while nothing has resolved.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductCreate from '@/modules/products/views/ProductCreate.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({ orvalMutator: vi.fn() }));

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string }) => {
        if (config.url === '/locales') return Promise.reject(new Error('404'));
        return Promise.resolve({ data: {} });
    });
    return loadLocale('en').then(() =>
        router.push('/en/products/new').then(() => router.isReady())
    );
});

const mountCreate = () =>
    mount(ProductCreate, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });

describe('ProductCreate — GET /locales unavailable', () => {
    it('renders the form on the fallback tab rather than the skeleton', async () => {
        const wrapper = mountCreate();

        await flushPromises();

        expect(wrapper.find('.v-skeleton-loader').exists()).toBe(false);
        expect(wrapper.find('[data-test=translation-tab-en]').exists()).toBe(true);
    });
});
