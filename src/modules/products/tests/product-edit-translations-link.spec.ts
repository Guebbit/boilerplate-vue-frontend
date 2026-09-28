/**
 * @module
 * LOCALES_OPTIONAL_0925 step 6a: `ProductEdit.vue`'s link to the generic translations screen must
 * not assume the route exists. A build with no `locales` module (the paired backend's own module
 * is optional; the frontend router mirrors whichever modules `src/modules.ts` enables) used to
 * throw resolving `:to="{ name: 'EntityTranslations' }"` against an unknown route name — this
 * proves a router missing that route renders the page and simply omits the link, and that having
 * the route back (with permission) still shows it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMongoAbility } from '@casl/ability';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductEdit from '@/modules/products/views/ProductEdit.vue';
import { orvalMutator } from '@/infrastructure/http';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({ orvalMutator: vi.fn() }));

/** Every module but `locales` — what a LOCALES_OPTIONAL build's own router would carry. */
const modulesWithoutLocales = enabledModules.filter((appModule) => appModule.name !== 'locales');

const routerWithTranslations = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

const routerWithoutTranslations = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: '/:locale',
            component: RouterView,
            children: collectModuleRoutes(modulesWithoutLocales)
        }
    ]
});

const ADMIN_PRODUCT = {
    id: 'p1',
    title: 'Widget',
    price: 9.99,
    currency: 'EUR',
    translations: { en: { title: 'Widget', description: 'A widget' } }
};

/** A signed-in session that CAN read translations — isolates the route check from the ability one. */
const signInWithTranslationsPermission = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'editor@example.com', role: 'editor' };
    session.tenantAbility = createMongoAbility([{ action: 'read', subject: 'Translation' }]);
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.url === '/locales')
            return Promise.resolve(
                parseOrvalFixture(
                    'GET',
                    '/locales',
                    orvalEnvelope({
                        locales: [
                            {
                                tag: 'en',
                                name: 'English',
                                nativeName: 'English',
                                direction: 'ltr',
                                active: true,
                                tenants: ['demo-fe'],
                                source: 'static',
                                entryCount: 0,
                                revision: 1
                            }
                        ],
                        default: 'en',
                        fallback: 'en'
                    })
                )
            );
        if (config.url === '/products/p1/admin')
            return Promise.resolve(
                parseOrvalFixture('GET', '/products/p1/admin', orvalEnvelope(ADMIN_PRODUCT))
            );
        return Promise.resolve(orvalEnvelope());
    });
    return loadLocale('en');
});

describe('ProductEdit — the translations link, with the route gone', () => {
    it('renders with no throw, and no link', async () => {
        signInWithTranslationsPermission();
        await routerWithoutTranslations.push('/en/products/p1/edit');
        await routerWithoutTranslations.isReady();

        const mountWithoutRoute = () =>
            mount(ProductEdit, {
                props: { id: 'p1' },
                global: {
                    plugins: [routerWithoutTranslations, vuetify, i18n],
                    stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
                }
            });

        expect(mountWithoutRoute).not.toThrow();
        const wrapper = mountWithoutRoute();
        await flushPromises();

        expect(wrapper.find('[data-test=translations-link]').exists()).toBe(false);
    });
});

describe('ProductEdit — the translations link, with the route and the permission', () => {
    it('shows the link', async () => {
        signInWithTranslationsPermission();
        await routerWithTranslations.push('/en/products/p1/edit');
        await routerWithTranslations.isReady();

        const wrapper = mount(ProductEdit, {
            props: { id: 'p1' },
            global: {
                plugins: [routerWithTranslations, vuetify, i18n],
                stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
            }
        });
        await flushPromises();

        expect(wrapper.find('[data-test=translations-link]').exists()).toBe(true);
    });
});
