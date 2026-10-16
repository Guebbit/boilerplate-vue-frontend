/**
 * @module
 * The create form hosts other modules' components through its `product-create-extras` slot (the
 * opening stock, from `inventory`): it hands each a way to register a step, and runs every step
 * with the new product's id once the product exists. The create body carries nothing of theirs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { defineComponent, h } from 'vue';
import ProductCreate from '../views/ProductCreate.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { SLOTS_KEY } from '@/kernel/slots.ts';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
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
                    orvalEnvelope({
                        id: 'p2',
                        title: 'New',
                        price: 1,
                        inStock: false,
                        lowStock: false
                    })
                )
            );
        return Promise.resolve(orvalEnvelope());
    });
    return loadLocale('en').then(() =>
        router.push('/en/products/new').then(() => router.isReady())
    );
});

/** What the stand-in contribution renders, so a test can tell it was mounted. */
const renderExtra = () => h('span', { 'data-test': 'extra' });

describe('ProductCreate — the product-create-extras slot', () => {
    it('runs every registered step with the new product id, after the create, and sends no stock', () => {
        const steps: string[] = [];
        const record = (productId: string) => {
            steps.push(productId);
            return Promise.resolve();
        };
        const Extra = defineComponent({
            props: { registerAfterCreate: { type: Function, required: true } },
            setup: (props) => {
                (props.registerAfterCreate as (step: (id: string) => Promise<void>) => void)(
                    record
                );
                return renderExtra;
            }
        });
        const wrapper = mount(ProductCreate, {
            global: {
                plugins: [router, vuetify, i18n],
                provide: { [SLOTS_KEY as symbol]: { 'product-create-extras': [Extra] } }
            }
        });

        return flushPromises()
            .then(flushPromises)
            .then(flushPromises)
            .then(() => wrapper.get('[data-test=translation-title-field] input').setValue('New'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=extra]').exists()).toBe(true);
                expect(steps).toEqual(['p2']);
                const created = vi
                    .mocked(orvalMutator)
                    .mock.calls.findLast(
                        ([config]) => (config as { method?: string }).method === 'POST'
                    );
                expect((created?.[0] as { data: Record<string, unknown> }).data).not.toHaveProperty(
                    'onHand'
                );
            });
    });
});
