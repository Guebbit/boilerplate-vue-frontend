/**
 * @module
 * The create form's release date: an entered date goes out as an ISO instant, and an empty field
 * leaves the key out (a create has nothing to clear, and the contract's create body takes no `null`).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductCreate from '../views/ProductCreate.vue';
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
                    orvalEnvelope({
                        id: 'p2',
                        title: 'New',
                        price: 1,
                        inStock: true,
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

/** Mounts the create form with the real router, i18n and Vuetify. */
const mountCreate = () =>
    mount(ProductCreate, {
        global: {
            plugins: [router, vuetify, i18n]
        }
    });

/**
 * Fills the title, optionally the release date, submits, and returns the POST body.
 *
 * @param releaseDate - The `datetime-local` text to type, or nothing to leave the field empty.
 */
const submitCreate = (releaseDate?: string) => {
    const wrapper = mountCreate();
    return flushPromises()
        .then(flushPromises)
        .then(flushPromises)
        .then(() => wrapper.get('[data-test=translation-title-field] input').setValue('New'))
        .then(() =>
            releaseDate === undefined
                ? undefined
                : wrapper.get('[data-test=product-release-date-field] input').setValue(releaseDate)
        )
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises)
        .then(flushPromises)
        .then(() => lastPost().data);
};

describe('ProductCreate — release date', () => {
    it('sends an entered date as the ISO instant of that wall-clock time', () =>
        submitCreate('2027-03-15T09:30').then((data) => {
            expect(data.releaseDate).toBe(new Date(2027, 2, 15, 9, 30).toISOString());
        }));

    it('leaves the key out when the field is empty', () =>
        submitCreate().then((data) => {
            expect(data.releaseDate).toBeUndefined();
        }));
});
