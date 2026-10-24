/**
 * @module
 * The languages board reads the server's `actions` flags: each control is shown exactly when its
 * flag is true, and switching a language on or off is its own call, never chained into a delete.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import LocalesList from '../views/LocalesList.vue';
import { useLocalesStore } from '../store.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { LanguageActions, LocaleCapability } from '@types';

wireModulesIntoCore();

/**
 * A registered language with the given flags.
 *
 * @param tag - The language tag.
 * @param active - Whether it is switched on.
 * @param actions - The flags the server would send.
 */
const language = (
    tag: string,
    active: boolean,
    actions: Partial<LanguageActions>
): LocaleCapability => ({
    tag,
    name: tag,
    nativeName: tag,
    direction: 'ltr',
    active,
    apps: ['frontend'],
    source: 'dynamic',
    entryCount: 0,
    revision: 0,
    actions: { update: false, activate: false, deactivate: false, delete: false, ...actions }
});

/** The real route tree, so the links in the board resolve. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the board over the given manifest, with the store's network calls stubbed.
 *
 * @param rows - The manifest rows.
 * @returns The wrapper and the store.
 */
const mountBoard = async (rows: LocaleCapability[]) => {
    const store = useLocalesStore();
    store.capabilities = rows;
    vi.spyOn(store, 'fetchLanguages').mockResolvedValue(undefined);
    vi.spyOn(store, 'fetchApps').mockResolvedValue(undefined);
    const wrapper = mount(LocalesList, { global: { plugins: [router, vuetify, i18n] } });
    await flushPromises();
    return { wrapper, store };
};

/** The control with this hook inside one language's row. */
const control = (
    wrapper: Awaited<ReturnType<typeof mountBoard>>['wrapper'],
    tag: string,
    hook: string
) => wrapper.find(`[data-language=${tag}] [data-test=${hook}]`);

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the row controls follow the server flags', () => {
    it('shows exactly the controls whose flag is true', async () => {
        const { wrapper } = await mountBoard([
            language('es', true, { update: true, deactivate: true }),
            language('fr', false, { update: true, activate: true, delete: true }),
            language('en', true, {})
        ]);

        expect(control(wrapper, 'es', 'row-edit').exists()).toBe(true);
        expect(control(wrapper, 'es', 'row-deactivate').exists()).toBe(true);
        expect(control(wrapper, 'es', 'row-activate').exists()).toBe(false);
        expect(control(wrapper, 'es', 'row-delete').exists()).toBe(false);

        expect(control(wrapper, 'fr', 'row-activate').exists()).toBe(true);
        expect(control(wrapper, 'fr', 'row-delete').exists()).toBe(true);
        expect(control(wrapper, 'fr', 'row-deactivate').exists()).toBe(false);

        expect(control(wrapper, 'en', 'row-edit').exists()).toBe(false);
        expect(control(wrapper, 'en', 'row-delete').exists()).toBe(false);
    });
});

describe('switching a language', () => {
    it('is one call for the one button pressed, with no delete behind it', async () => {
        const { wrapper, store } = await mountBoard([
            language('es', true, { update: true, deactivate: true })
        ]);
        const deactivate = vi.spyOn(store, 'deactivateLanguage').mockResolvedValue(undefined);
        const remove = vi.spyOn(store, 'removeLanguage').mockResolvedValue(undefined);

        await control(wrapper, 'es', 'row-deactivate').trigger('click');
        await flushPromises();

        expect(deactivate).toHaveBeenCalledExactlyOnceWith('es');
        expect(remove).not.toHaveBeenCalled();
    });

    it('asks before a delete, and deletes the language once the flag allows it', async () => {
        const { wrapper, store } = await mountBoard([
            language('fr', false, { update: true, activate: true, delete: true })
        ]);
        const remove = vi.spyOn(store, 'removeLanguage').mockResolvedValue(undefined);
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);

        await control(wrapper, 'fr', 'row-delete').trigger('click');
        await flushPromises();

        expect(confirm).toHaveBeenCalledOnce();
        expect(remove).toHaveBeenCalledExactlyOnceWith('fr');
    });
});
