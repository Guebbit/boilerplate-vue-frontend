/**
 * @module
 * D11: a create form has no product to read `currency` from, so its price input is sized from the
 * shop's own (`GET /products/settings`) — a JPY shop has no cents to type, a KWD shop has three.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { VNumberInput } from 'vuetify/components';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductCreate from '@/modules/products/views/ProductCreate.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import { resetShopCurrency } from '@/infrastructure/shop-currency.ts';
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
 * What `GET /products/settings` answers in the current case.
 */
let shopCurrencyCode = 'EUR';

beforeEach(() => {
    shopCurrencyCode = 'EUR';
    resetShopCurrency();
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.url === '/locales')
            return Promise.resolve(
                parseOrvalFixture('GET', '/locales', orvalEnvelope(LOCALES_RESPONSE))
            );
        if (config.url === '/products/settings')
            return Promise.resolve(
                parseOrvalFixture(
                    'GET',
                    '/products/settings',
                    orvalEnvelope({ currency: shopCurrencyCode })
                )
            );
        if (config.method === 'POST')
            return Promise.resolve(
                parseOrvalFixture(
                    'POST',
                    '/products',
                    orvalEnvelope({ id: 'p2', title: 'New', price: 1 })
                )
            );
        return Promise.resolve(orvalEnvelope());
    });
    return loadLocale('en').then(() =>
        router.push('/en/products/new').then(() => router.isReady())
    );
});

const mountCreate = () =>
    mount(ProductCreate, {
        global: {
            plugins: [router, vuetify, i18n]
        }
    });

/**
 * The decimals the price input accepts, read off the field the form rendered.
 */
const pricePrecision = (wrapper: ReturnType<typeof mountCreate>) =>
    wrapper.getComponent(VNumberInput).props('precision');

describe('ProductCreate — the price input follows the shop currency', () => {
    it.each([
        ['EUR', 2],
        ['JPY', 0],
        ['KWD', 3]
    ])('%s takes %i decimals', (currency, digits) => {
        shopCurrencyCode = currency;
        const wrapper = mountCreate();
        return flushPromises()
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                expect(pricePrecision(wrapper)).toBe(digits);
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
