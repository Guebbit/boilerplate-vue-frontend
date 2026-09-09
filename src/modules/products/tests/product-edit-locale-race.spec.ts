/**
 * @module
 * Reproduces the fetch-ordering race `ProductEdit.vue`'s tab bar must survive: the page's own,
 * independent `fetchActiveLocales()` (`GET /locales`) answering before `loadAdminProduct()`
 * (`GET /products/{id}/admin`) does. Before the fix, `openTags` unconditionally opened the
 * fallback tab the moment the fallback tag was known, and the template's
 * `form.translations[tag]!.title` threw once Vue re-rendered against a `form.translations` still
 * empty — a render error `@vue/test-utils` does not surface as a rejected promise, since it fires
 * from inside Vue's own reactivity flush, not from this spec's call stack. `global.config.
 * errorHandler` is what makes that error observable instead of a silent aborted render.
 *
 * Mirrors `product-view.spec.ts`'s real-router mount, and `products/store.spec.ts`'s
 * `orvalMutator` mock — here driven by hand so each endpoint answers on its own schedule.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductEdit from '@/modules/products/views/ProductEdit.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/infrastructure/i18n';
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

/**
 * The real app router, scoped to the modules this spec enables — same template as
 * `product-view.spec.ts`. No guards attached (those live in `src/app/router/index.ts`), so
 * pushing straight to the admin-only edit route needs no signed-in session.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * A `GET /locales` payload with one active locale, `en` — also the deployment's fallback.
 */
const LOCALES_RESPONSE = {
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
};

/**
 * A `GET /products/p1/admin` payload with a row for the fallback locale only.
 */
const ADMIN_RESPONSE = {
    id: 'p1',
    title: 'Widget',
    price: 9.99,
    translations: { en: { title: 'Widget', description: 'A widget' } }
};

/**
 * A promise this spec resolves on its own schedule — one per raced endpoint, so the test controls
 * which of the two answers first.
 */
const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((settle) => {
        resolve = settle;
    });
    return { promise, resolve };
};

/**
 * Waits past every microtask queued so far, including Vue's own render flush — a `nextTick()` or
 * two does not reliably drain a chain this deep. Same helper as `cart-view.spec.ts`'s
 * `flushAsync`.
 */
const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push('/en/products/p1/edit').then(() => router.isReady())
    );
});

describe('the edit form under a locales-before-admin-record race', () => {
    it('opens no tab while the admin record is still in flight, then opens once it arrives', () => {
        const locales = deferred<unknown>();
        const admin = deferred<unknown>();

        vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
            if (config.url === '/locales') return locales.promise;
            if (config.url === '/products/p1/admin') return admin.promise;
            return Promise.resolve(orvalEnvelope());
        });

        const renderErrors: unknown[] = [];
        const wrapper = mount(ProductEdit, {
            props: { id: 'p1' },
            global: {
                plugins: [router, vuetify, i18n],
                stubs: { LayoutDefault: { template: '<div><slot /></div>' } },
                // Without this, a render error thrown from Vue's own reactivity flush (exactly
                // what the bug produces) never reaches this spec as a rejection — it is only
                // observable through the handler.
                config: { errorHandler: (error: unknown) => renderErrors.push(error) }
            }
        });

        // GET /locales answers first — the race condition's trigger.
        locales.resolve(parseOrvalFixture('GET', '/locales', orvalEnvelope(LOCALES_RESPONSE)));

        return flushAsync()
            .then(() => {
                expect(renderErrors).toHaveLength(0);
                // The fallback tag is known, but nothing is open yet: `form.translations` has no
                // `en` entry until the admin record lands.
                expect(wrapper.find('[data-test=translation-tab-en]').exists()).toBe(false);
                expect(wrapper.find('[data-test=translation-title-field]').exists()).toBe(false);

                admin.resolve(
                    parseOrvalFixture('GET', '/products/p1/admin', orvalEnvelope(ADMIN_RESPONSE))
                );
                return flushAsync();
            })
            .then(() => {
                expect(renderErrors).toHaveLength(0);
                expect(wrapper.find('[data-test=translation-tab-en]').exists()).toBe(true);
                expect(
                    wrapper.get<HTMLInputElement>('[data-test=translation-title-field] input')
                        .element.value
                ).toBe('Widget');
            });
    });
});
