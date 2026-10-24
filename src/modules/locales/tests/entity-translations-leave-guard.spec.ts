/**
 * @module
 * The translations screen hands `useLeaveGuard` an `isDirty` that follows the drafts: clean after a
 * load, dirty after an edit, an opened tab or a tab marked for removal, clean again once the
 * values are back to what the server holds.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, type Ref } from 'vue';
import EntityTranslations from '../views/EntityTranslations.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';

/** The arguments the screen gave the guard, captured from the mocked composable. */
const guard = vi.hoisted(() => ({
    isDirty: undefined as undefined | Ref<boolean>
}));

vi.mock('@/ui/composables/use-leave-guard.ts', () => ({
    useLeaveGuard: (isDirty: Ref<boolean>) => {
        guard.isDirty = isDirty;
        return { markSaved: () => undefined };
    }
}));

vi.mock('vue-router', async (importOriginal) => ({
    ...(await importOriginal<typeof import('vue-router')>()),
    useRoute: () => ({ params: { entityType: 'product', id: 'p1' } })
}));

vi.mock('../store.ts', () => ({
    useLocalesStore: () => ({
        capabilities: [],
        fallbackLocale: 'en',
        fetchLanguages: () => Promise.resolve([]),
        fetchEntityTranslations: () =>
            Promise.resolve({
                fields: ['name'],
                translations: [{ locale: 'en', fields: { name: 'Shoe' } }]
            }),
        saveEntityTranslations: () => Promise.resolve()
    })
}));

/** Mounts the screen with the tab bar stubbed down to its events. */
const mountScreen = () =>
    mount(EntityTranslations, {
        global: {
            plugins: [vuetify, i18n],
            stubs: { TranslationTabs: TabsStub, RouterLink: true }
        }
    });

/**
 * The tab bar reduced to two buttons that fire its events, `add es` and `remove <tag>`.
 */
const TabsStub = defineComponent({
    emits: ['add', 'remove'],
    setup:
        (_props, { emit }) =>
        () =>
            h('div', [
                h('button', { 'data-test': 'add-es', onClick: () => emit('add', 'es') }),
                h('button', { 'data-test': 'remove-es', onClick: () => emit('remove', 'es') }),
                h('button', { 'data-test': 'remove-en', onClick: () => emit('remove', 'en') })
            ])
});

beforeEach(() => {
    setActivePinia(createPinia());
    guard.isDirty = undefined;
    return loadLocale('en');
});

describe('EntityTranslations leave guard', () => {
    it('reads clean right after the load', async () => {
        mountScreen();
        await flushPromises();

        expect(guard.isDirty?.value).toBe(false);
    });

    it('reads dirty once a field is edited, and clean again when it is put back', async () => {
        const wrapper = mountScreen();
        await flushPromises();
        const field = () => wrapper.get('[data-field=name] textarea');

        await field().setValue('Boot');
        expect(guard.isDirty?.value).toBe(true);

        await field().setValue('Shoe');
        expect(guard.isDirty?.value).toBe(false);
    });

    it('reads dirty for a tab opened this session, and clean when it is closed again', async () => {
        const wrapper = mountScreen();
        await flushPromises();
        await wrapper.get('[data-test=add-es]').trigger('click');
        expect(guard.isDirty?.value).toBe(true);

        await wrapper.get('[data-test=remove-es]').trigger('click');
        expect(guard.isDirty?.value).toBe(false);
    });

    it('reads dirty for a saved tab marked for removal', async () => {
        const wrapper = mountScreen();
        await flushPromises();

        await wrapper.get('[data-test=remove-en]').trigger('click');

        expect(guard.isDirty?.value).toBe(true);
    });
});
