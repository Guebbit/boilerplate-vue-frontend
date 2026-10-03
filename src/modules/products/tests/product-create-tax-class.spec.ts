/**
 * @module
 * PL-72: a create form has nothing to clear yet, so leaving `taxClass` untouched must OMIT the
 * key entirely (unlike the edit form's explicit `null`) — and the field itself must be on screen.
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
 * The generated client sends every method uppercase (`method: 'POST'`).
 */
const lastPost = () => {
    const call = vi
        .mocked(orvalMutator)
        .mock.calls.findLast(([config]) => (config as { method?: string }).method === 'POST');
    if (!call) throw new Error('no POST was sent');
    return call[0] as { data: Record<string, unknown> };
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.url === '/locales')
            return Promise.resolve(
                parseOrvalFixture('GET', '/locales', orvalEnvelope(LOCALES_RESPONSE))
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

describe('ProductCreate — taxClass', () => {
    it('shows the field and omits the key when left at shop default', () => {
        const wrapper = mountCreate();
        return flushPromises()
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=product-tax-class-field]').exists()).toBe(true);
                return wrapper
                    .get('[data-test=translation-title-field] input')
                    .setValue('New')
                    .then(() => wrapper.get('form').trigger('submit'));
            })
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                // Present-but-`undefined`, same as every other unset optional field here
                // (`weight`, `categories`) — JSON serialization is what actually drops the key
                // on the wire; this asserts the value that makes that happen.
                expect(lastPost().data.taxClass).toBeUndefined();
            });
    });
});
