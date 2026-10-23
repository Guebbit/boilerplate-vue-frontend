/**
 * @module
 * The locale admin lists that ask before they delete: a second press made before the first
 * answer must not ask again or delete again.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import LocaleEntries from '../views/LocaleEntries.vue';
import LocalesList from '../views/LocalesList.vue';
import { useLocalesStore } from '../store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import type { LocaleCapability } from '@types';

wireModulesIntoCore();

/** One entry of the open language. */
const ENTRY = {
    id: 'locale-entry-1',
    locale: 'es',
    app: 'demo-fe',
    key: 'generic.search',
    value: 'Buscar'
};

/** What the mocked transport answers, by `METHOD /url`. */
const responses: Record<string, unknown> = {
    'GET /locales/es/entries': orvalEnvelope({
        items: [ENTRY],
        meta: { totalItems: 1, totalPages: 1 }
    }),
    'DELETE /locales/es/apps/demo-fe/entries/locale-entry-1': orvalEnvelope()
};

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                responses[`${config.method.toUpperCase()} ${config.url}`]
            )
        )
    )
}));

/** An inactive language, so its deletion is the single `removeLanguage` call. */
const SPANISH: LocaleCapability = {
    tag: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    active: false,
    apps: ['backend'],
    source: 'dynamic',
    entryCount: 3,
    revision: 1
};

/** The real route tree, so the links in the views resolve. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockClear();
    return loadLocale('en');
});

describe('a double press on a locale delete', () => {
    it('deletes a language once', async () => {
        const store = useLocalesStore();
        store.capabilities = [SPANISH];
        vi.spyOn(store, 'fetchLanguages').mockResolvedValue(undefined);
        vi.spyOn(store, 'fetchApps').mockResolvedValue(undefined);
        const remove = vi.spyOn(store, 'removeLanguage').mockResolvedValue(undefined);
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mount(LocalesList, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();
        const button = wrapper.get('[data-test=row-delete]');

        void button.trigger('click');
        void button.trigger('click');
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it('deletes an entry once', async () => {
        const store = useLocalesStore();
        store.capabilities = [SPANISH];
        vi.spyOn(store, 'fetchApps').mockResolvedValue(undefined);
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        void router.push('/en/locales/es');
        await router.isReady();
        const wrapper = mount(LocaleEntries, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();
        const button = wrapper.get('[data-test=entry-delete]');

        void button.trigger('click');
        void button.trigger('click');
        await flushPromises();

        const deletes = vi
            .mocked(orvalMutator)
            .mock.calls.filter(([config]) => (config as { method: string }).method === 'DELETE');
        expect(confirm).toHaveBeenCalledTimes(1);
        expect(deletes).toHaveLength(1);
    });
});
