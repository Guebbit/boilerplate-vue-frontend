/**
 * @module
 * PL-72: the edit form must round-trip `taxClass` like every other editable field — hydrate it
 * from the admin record, keep the "shop default" case explicit (`null` on the wire, not an
 * omitted key, since only `translations` gets this PATCH's merge exception), and let it change to
 * a rate. Mounting and the locales-then-admin resolution order both mirror
 * `product-edit-locale-race.spec.ts`, whose sequencing this same view depends on.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductEdit from '@/modules/products/views/ProductEdit.vue';
import { orvalMutator } from '@/infrastructure/http';
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

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

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
 * A promise this spec resolves on its own schedule, one per endpoint — same helper as
 * `product-edit-locale-race.spec.ts`, needed here for the same reason: the admin record must
 * land strictly after the locales response, or the tab bar never opens.
 */
const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((settle) => {
        resolve = settle;
    });
    return { promise, resolve };
};

/**
 * The admin record's own PATCH echo — its shape doesn't matter to this spec, only that the
 * post-submit reload has something valid to land on.
 */
const echo = (body: Record<string, unknown>) => ({
    id: 'p1',
    title: 'Widget',
    price: 9.99,
    currency: 'EUR',
    translations: { en: { title: 'Widget', description: 'A widget' } },
    ...body
});

/**
 * The axios config handed to `orvalMutator` for the PATCH — the request that actually matters
 * here (this form always sends PATCH, never PUT — see Q10's answer). The generated client sends
 * every method uppercase (`method: 'PATCH'`), unlike `parseOrvalFixture`'s own case-insensitive
 * lookup.
 */
const lastPatch = () => {
    const call = vi
        .mocked(orvalMutator)
        .mock.calls.findLast(([config]) => (config as { method?: string }).method === 'PATCH');
    if (!call) throw new Error('no PATCH was sent');
    return call[0] as { data: Record<string, unknown> };
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    return loadLocale('en').then(() =>
        router.push('/en/products/p1/edit').then(() => router.isReady())
    );
});

/**
 * Mounts the edit form and drives it to a fully hydrated, tab-open state: locales resolve, a
 * flush, then the admin record (with the given `taxClass`) resolves, another flush.
 */
const mountHydrated = (adminTaxClass: Record<string, unknown>) => {
    const locales = deferred<unknown>();
    const admin = deferred<unknown>();
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.url === '/locales') return locales.promise;
        if (config.url === '/products/p1/admin') return admin.promise;
        if (config.method === 'PATCH')
            return Promise.resolve(
                parseOrvalFixture('PATCH', '/products/p1', orvalEnvelope(echo({})))
            );
        return Promise.resolve(orvalEnvelope());
    });

    const wrapper = mount(ProductEdit, {
        props: { id: 'p1' },
        global: {
            plugins: [router, vuetify, i18n]
        }
    });

    locales.resolve(parseOrvalFixture('GET', '/locales', orvalEnvelope(LOCALES_RESPONSE)));
    return flushPromises()
        .then(() => {
            admin.resolve(
                parseOrvalFixture('GET', '/products/p1/admin', orvalEnvelope(echo(adminTaxClass)))
            );
            return flushPromises();
        })
        .then(() => wrapper);
};

describe('ProductEdit — taxClass round-trip', () => {
    it('hydrates a rated product and resends its class unchanged', () => {
        return mountHydrated({ taxClass: 'reduced' })
            .then((wrapper) => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatch().data.taxClass).toBe('reduced');
            });
    });

    it('hydrates a product with no class as an explicit shop-default null, and resubmits null', () => {
        return mountHydrated({})
            .then((wrapper) => {
                expect(wrapper.find('[data-test=product-tax-class-field]').exists()).toBe(true);
                return wrapper.get('form').trigger('submit');
            })
            .then(flushPromises)
            .then(() => {
                expect(lastPatch().data.taxClass).toBeNull();
            });
    });
});
