/**
 * @module
 * `ExampleTarget`'s delete: a second press made before the first answer must not ask again or
 * delete again.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import ExampleTarget from '../views/ExampleTarget.vue';
import { useExampleStore } from '../store';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Example } from '@types';

wireModulesIntoCore();

/** The real route tree, so the page's links resolve. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** An example its viewer may delete. */
const EXAMPLE: Example = {
    id: 'ex-1',
    title: 'A title',
    body: 'A body',
    status: 'draft',
    userId: 'u-1',
    ownerName: 'ada',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    actions: { transitions: [], update: true, delete: true }
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push(`/en/examples/${EXAMPLE.id}`).then(() => router.isReady())
    );
});

describe('a double press on the example delete', () => {
    it('deletes once', async () => {
        const store = useExampleStore();
        store.addExampleRecord({ ...EXAMPLE });
        store.selectedExampleId = EXAMPLE.id;
        vi.spyOn(store, 'watchExample').mockReturnValue(vi.fn() as never);
        const remove = vi.spyOn(store, 'deleteExample').mockResolvedValue(undefined);
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mount(ExampleTarget, {
            props: { id: EXAMPLE.id },
            global: { plugins: [router, vuetify, i18n] }
        });
        await flushPromises();
        const button = wrapper.get('[data-test=example-delete]');

        await Promise.all([button.trigger('click'), button.trigger('click')]);
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
    });
});
