/**
 * @module
 * Mounts the real create page against a real, memory-history router: what the form refuses before
 * anything is sent, the exact payload it sends, where a success goes, and what a refusal does.
 * The store's calls are spied at the store; the HTTP layer under them has its own suite.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ExampleCreate from '@/modules/example/views/ExampleCreate.vue';
import { useExampleStore } from '@/modules/example/store';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Example } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this suite enables, so the redirect after a create
 * is a real navigation.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * What the API answers a create with. Typed against the generated contract, so a field it adds or
 * requires fails compilation here.
 */
const CREATED: Example = {
    id: 'ex-1',
    title: 'A title',
    body: 'A body',
    status: 'draft',
    userId: 'u-1',
    ownerName: 'ada',
    createdAt: '2026-01-01T00:00:00.000Z'
};

/**
 * Mounts the page with its store call spied BEFORE mount: the view destructures it at setup.
 *
 * @returns The wrapper and the create spy each case configures.
 */
const mountPage = () => {
    const create = vi.spyOn(useExampleStore(), 'createExample');
    const wrapper = mount(ExampleCreate, {
        attachTo: document.body,
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, create };
};

/**
 * Types a title and a body and submits.
 *
 * @param wrapper - The mounted page.
 * @param title - What goes in the title field.
 * @param body - What goes in the body field.
 */
const fillAndSubmit = (
    wrapper: ReturnType<typeof mountPage>['wrapper'],
    title: string,
    body: string
) =>
    wrapper
        .get('[data-test=example-title] input')
        .setValue(title)
        .then(() => wrapper.get('[data-test=example-body] textarea').setValue(body))
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);

beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    return loadLocale('en').then(() =>
        router.push('/en/examples/create').then(() => router.isReady())
    );
});

describe('ExampleCreate', () => {
    it('refuses an empty title, and sends nothing', () => {
        const { wrapper, create } = mountPage();

        return fillAndSubmit(wrapper, '', 'A body').then(() => {
            expect(create).not.toHaveBeenCalled();
            expect(wrapper.find('[data-test=example-title] .v-messages').text()).not.toBe('');
        });
    });

    it('sends exactly what was typed, then opens the new example', () => {
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(CREATED);

        return fillAndSubmit(wrapper, 'A title', 'A body')
            .then(() => {
                expect(create).toHaveBeenCalledWith({ title: 'A title', body: 'A body' });
                return vi.waitFor(() => {
                    if (!router.currentRoute.value.fullPath.endsWith('/ex-1'))
                        throw new Error('still on the create page');
                });
            })
            .then(() => {
                expect(router.currentRoute.value.fullPath).toBe('/en/examples/ex-1');
                wrapper.unmount();
            });
    });

    it('puts a server refusal that names a field on that field', () => {
        const { wrapper, create } = mountPage();
        create.mockRejectedValue({
            success: false,
            status: 422,
            message: 'Unprocessable Entity',
            errors: [{ code: 'VALIDATION', field: 'body', message: 'Too long for this deployment' }]
        });

        return fillAndSubmit(wrapper, 'A title', 'A body').then(() => {
            expect(wrapper.find('[data-test=example-body] .v-messages').text()).toContain(
                'Too long for this deployment'
            );
            expect(router.currentRoute.value.fullPath).toBe('/en/examples/create');
        });
    });

    it('blocks the form in place when the API fails some other way', () => {
        const { wrapper, create } = mountPage();
        create.mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server error',
            errors: [{ code: 'INTERNAL', message: 'Server error' }]
        });

        return fillAndSubmit(wrapper, 'A title', 'A body').then(() => {
            expect(wrapper.find('[data-test=example-create-error]').exists()).toBe(true);
            expect(router.currentRoute.value.fullPath).toBe('/en/examples/create');
        });
    });
});
