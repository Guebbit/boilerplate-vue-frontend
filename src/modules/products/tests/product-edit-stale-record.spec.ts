/**
 * @module
 * A save answered 412 (the product changed since the form loaded it): the form warns in place —
 * a warning, not an error — offers "reload latest", and re-reads the admin record when it is
 * pressed. It never resends the stale edit on its own. Mounting mirrors
 * `product-edit-no-withdrawal.spec.ts`, whose sequencing this view depends on.
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

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    return loadLocale('en').then(() =>
        router.push('/en/products/p1/edit').then(() => router.isReady())
    );
});

/**
 * The reject envelope `onResponseReject` builds for the API's 412.
 */
const PRECONDITION_FAILED = {
    success: false,
    status: 412,
    message: 'Precondition Failed',
    errors: [{ code: 'PRECONDITION_FAILED', message: 'Precondition failed' }]
};

/**
 * How many times the admin record was read.
 */
const adminReads = () =>
    vi.mocked(orvalMutator).mock.calls.filter(([config]) => config.url === '/products/p1/admin')
        .length;

/**
 * Mounts the hydrated form with a PATCH that answers 412 and an admin read that always answers.
 */
const mountRefused = () => {
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.url === '/locales')
            return Promise.resolve(
                parseOrvalFixture('GET', '/locales', orvalEnvelope(LOCALES_RESPONSE))
            );
        if (config.url === '/products/p1/admin')
            return Promise.resolve(
                parseOrvalFixture('GET', '/products/p1/admin', orvalEnvelope(echo({})))
            );
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
        if (config.method === 'PATCH') return Promise.reject(PRECONDITION_FAILED);
        return Promise.resolve(orvalEnvelope());
    });
    const wrapper = mount(ProductEdit, {
        props: { id: 'p1' },
        global: {
            plugins: [router, vuetify, i18n]
        }
    });
    return flushPromises().then(() => wrapper);
};

describe('ProductEdit — a save answered 412', () => {
    it('warns that someone else changed the product, and offers to reload', () =>
        mountRefused()
            .then((wrapper) =>
                wrapper
                    .get('form')
                    .trigger('submit')
                    .then(() => wrapper)
            )
            .then((wrapper) => flushPromises().then(() => wrapper))
            .then((wrapper) => {
                const alert = wrapper.get('[data-test=product-edit-submit-error]');
                expect(alert.text()).toContain(i18n.global.t('generic.error-stale-record'));
                // A warning: nothing is wrong with the request, the record moved.
                expect(alert.classes().join(' ')).toContain('warning');
                expect(wrapper.find('[data-test=product-edit-reload-latest]').exists()).toBe(true);
            }));

    it('re-reads the admin record on "reload latest", and clears the warning', () =>
        mountRefused()
            .then((wrapper) =>
                wrapper
                    .get('form')
                    .trigger('submit')
                    .then(() => wrapper)
            )
            .then((wrapper) => flushPromises().then(() => wrapper))
            .then((wrapper) => {
                const readsBefore = adminReads();
                return wrapper
                    .get('[data-test=product-edit-reload-latest]')
                    .trigger('click')
                    .then(flushPromises)
                    .then(() => {
                        expect(adminReads()).toBe(readsBefore + 1);
                        expect(
                            wrapper.find('[data-test=product-edit-reload-latest]').exists()
                        ).toBe(false);
                        expect(wrapper.find('[data-test=product-edit-submit-error]').exists()).toBe(
                            false
                        );
                    });
            }));

    it('does not send the stale edit again by itself', () =>
        mountRefused()
            .then((wrapper) => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const patches = vi
                    .mocked(orvalMutator)
                    .mock.calls.filter(([config]) => config.method === 'PATCH');
                expect(patches).toHaveLength(1);
            }));
});
