/**
 * @module
 * The edit form round-trips `purchasable` (off sale): hydrated from the admin record, sent on
 * every PATCH, and proven against the contract's own body schema so a drift in what is sent fails
 * here. Mounting mirrors `product-edit-no-withdrawal.spec.ts`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductEdit from '../views/ProductEdit.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import * as schemas from '@api/schemas';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({ orvalMutator: vi.fn() }));

/** Memory-history router carrying the real module routes. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The `GET /locales` answer: one active language, `en`, also the fallback. */
const LOCALES_RESPONSE = {
    locales: [
        {
            tag: 'en',
            name: 'English',
            nativeName: 'English',
            direction: 'ltr',
            active: true,
            apps: ['demo-fe'],
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
 * flush, then the admin record (with the given fields) resolves, another flush.
 */
const mountHydrated = (adminRecord: Record<string, unknown>) => {
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
                parseOrvalFixture('GET', '/products/p1/admin', orvalEnvelope(echo(adminRecord)))
            );
            return flushPromises();
        })
        .then(() => wrapper);
};

describe('ProductEdit — purchasable round-trip', () => {
    it('hydrates an off-sale product and resends the flag as false', () =>
        mountHydrated({ purchasable: false })
            .then((wrapper) => {
                expect(wrapper.find('[data-test=product-purchasable-field]').exists()).toBe(true);
                return wrapper.get('form').trigger('submit');
            })
            .then(flushPromises)
            .then(() => {
                const body = contractRequest(schemas.UpdateProductByIdBody, lastPatch().data);
                expect(body).toMatchObject({ purchasable: false });
            }));

    it('sends true for an ordinary product, never leaving the flag out', () =>
        mountHydrated({ purchasable: true })
            .then((wrapper) => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatch().data.purchasable).toBe(true);
            }));

    it('reads a record without the flag as on sale', () =>
        mountHydrated({})
            .then((wrapper) => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatch().data.purchasable).toBe(true);
            }));
});
