/**
 * @module
 * A translations save answered 412 (the entity was edited since the screen loaded) says so in
 * place, offers "reload latest", and reload re-reads the rows instead of resending the save.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import EntityTranslations from '../views/EntityTranslations.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';

/** The store calls the screen makes, as spies the tests can count. */
const store = vi.hoisted(() => ({
    fetchEntityTranslations: vi.fn(),
    saveEntityTranslations: vi.fn()
}));

vi.mock('vue-router', async (importOriginal) => ({
    ...(await importOriginal<typeof import('vue-router')>()),
    useRoute: () => ({ params: { entityType: 'product', id: 'p1' } })
}));

vi.mock('@/infrastructure/session.ts', () => ({
    useSessionStore: () => ({ can: () => true, isAuth: true })
}));

vi.mock('../store.ts', async () => {
    // Refs, as the real store's `capabilities` and `fallbackLocale` are: the screen reads them via `storeToRefs`.
    const { ref } = await import('vue');
    return {
        useLocalesStore: () => ({
            capabilities: ref([]),
            fallbackLocale: ref('en'),
            fetchLanguages: () => Promise.resolve([]),
            ...store
        })
    };
});

/** The tab bar is not under test: an inert stand-in that takes no props. */
const renderEmpty = () => h('div');

const TabsStub = defineComponent({ setup: () => renderEmpty });

beforeEach(() => {
    setActivePinia(createPinia());
    store.fetchEntityTranslations.mockReset().mockResolvedValue({
        fields: ['name'],
        source: { fields: { name: 'Shoe' }, digest: 'd1' },
        translations: [{ locale: 'it', fields: { name: 'Scarpa' }, outdated: false }]
    });
    store.saveEntityTranslations
        .mockReset()
        .mockRejectedValue(
            aProblem(412, [{ code: 'PRECONDITION_FAILED', message: 'Precondition failed' }])
        );
    return loadLocale('en');
});

describe('EntityTranslations stale save', () => {
    it('warns on a 412 and reloads the rows on request, without resending the save', async () => {
        const wrapper = mount(EntityTranslations, {
            global: {
                plugins: [vuetify, i18n],
                stubs: { TranslationTabs: TabsStub, RouterLink: true }
            }
        });
        await flushPromises();

        await wrapper.get('[data-test=entity-translations-save]').trigger('click');
        await flushPromises();
        await wrapper.get('[data-test=entity-translations-reload-latest]').trigger('click');
        await flushPromises();

        expect(store.saveEntityTranslations).toHaveBeenCalledTimes(1);
        expect(store.fetchEntityTranslations).toHaveBeenCalledTimes(2);
    });
});
