/**
 * @module
 * D11: a create form has no product to read `currency` from, so its price is written at the shop's
 * own places (`GET /shop` `minorUnits`) — a JPY shop has no cents, a KWD shop has three.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductCreate from '../views/ProductCreate.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import { resetShop } from '@/infrastructure/shop.ts';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aShop } from '../../../../tests/support/unit/fixtures.ts';
import { parseOrvalFixture } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

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
 * What `GET /shop` answers in the current case.
 */
let shopCurrencyCode = 'EUR';

/**
 * The places `GET /shop` reports for {@link shopCurrencyCode}.
 */
let shopMinorUnits = 2;

beforeEach(() => {
    shopCurrencyCode = 'EUR';
    shopMinorUnits = 2;
    resetShop();
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.url === '/locales')
            return Promise.resolve(parseOrvalFixture('GET', '/locales', LOCALES_RESPONSE));
        if (config.url === '/shop')
            return Promise.resolve(
                parseOrvalFixture(
                    'GET',
                    '/shop',
                    aShop({ currency: shopCurrencyCode, minorUnits: shopMinorUnits })
                )
            );
        if (config.method === 'POST')
            return Promise.resolve(
                parseOrvalFixture('POST', '/products', {
                    id: 'p2',
                    title: 'New',
                    price: '1.00',
                    inStock: true,
                    lowStock: false
                })
            );
        return Promise.resolve(undefined);
    });
    return loadLocale('en').then(() =>
        router.push('/en/products/new').then(() => router.isReady())
    );
});

/** Mounts the create form with the real router, i18n and Vuetify. */
const mountCreate = () =>
    mount(ProductCreate, {
        global: {
            plugins: [router, vuetify, i18n]
        }
    });

/**
 * The generated client sends every method uppercase (`method: 'POST'`).
 */
const lastPost = () => {
    const call = vi
        .mocked(orvalMutator)
        .mock.calls.findLast(([config]) => (config as { method?: string }).method === 'POST');
    if (!call) throw new Error('no POST was sent');
    return call[0] as { data: Record<string, unknown> };
};

describe('ProductCreate — the price is sent at the shop currency places', () => {
    it.each([
        ['EUR', 2, '12.5', '12.50'],
        ['EUR', 2, '12', '12.00'],
        ['JPY', 0, '1000', '1000'],
        ['KWD', 3, '1.5', '1.500']
    ])('%s (%i places): the typed %s goes out as %s', (currency, places, typed, sent) => {
        shopCurrencyCode = currency;
        shopMinorUnits = places;
        const wrapper = mountCreate();
        return flushPromises()
            .then(flushPromises)
            .then(flushPromises)
            .then(() => wrapper.get('[data-test=product-price-field] input').setValue(typed))
            .then(() => wrapper.get('[data-test=translation-title-field] input').setValue('New'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                expect(lastPost().data.price).toBe(sent);
            });
    });

    it('names the currency beside the amount', () => {
        shopCurrencyCode = 'JPY';
        const wrapper = mountCreate();
        return flushPromises()
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                expect(wrapper.get('[data-test=product-price-field]').text()).toContain('JPY');
            });
    });
});
