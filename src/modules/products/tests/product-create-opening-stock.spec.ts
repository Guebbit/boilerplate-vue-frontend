/**
 * @module
 * The opening-stock field on the create form is a stock movement: the server refuses a count from
 * a caller without `inventory.any.create`, so the form offers it only to one who holds it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductCreate from '../views/ProductCreate.vue';
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
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string }) =>
        Promise.resolve(
            config.url === '/locales'
                ? parseOrvalFixture('GET', '/locales', orvalEnvelope(LOCALES_RESPONSE))
                : orvalEnvelope()
        )
    );
    return loadLocale('en').then(() =>
        router.push('/en/products/new').then(() => router.isReady())
    );
});

/**
 * Mounts the create form for a caller holding exactly `abilities`.
 *
 * @param abilities - What the viewer may do, as `[action, subject]` pairs.
 */
const mountCreateAs = (abilities: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'staff@example.com', role: 'editor' };
    session.setAbilities({ tenant: abilities, platform: [] });

    return mount(ProductCreate, { global: { plugins: [router, vuetify, i18n] } });
};

describe('ProductCreate — opening stock', () => {
    it('is offered to a caller who may book stock', () => {
        const wrapper = mountCreateAs([['create', 'StockMovement']]);

        return flushPromises()
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=product-on-hand-field]').exists()).toBe(true);
            });
    });

    it('is not offered to a caller who may edit the catalogue but not book stock', () => {
        const wrapper = mountCreateAs([['create', 'Product']]);

        return flushPromises()
            .then(flushPromises)
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=product-on-hand-field]').exists()).toBe(false);
            });
    });
});
