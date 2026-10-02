/**
 * @module
 * The public page reads through the store's public call and holds the answer locally. A 404, which
 * is also what a draft or an archived example answers, sends the visitor to the shell's Error page.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ExamplePublished from '@/modules/example/views/ExamplePublished.vue';
import { useExampleStore } from '@/modules/example/store';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Example } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this suite enables, with a stand-in for the shell's
 * Error page so the redirect has somewhere to land.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: '/:locale',
            component: RouterView,
            children: [
                ...collectModuleRoutes(enabledModules),
                { path: 'error/:status/:message?', name: 'Error', component: { template: '<i />' } }
            ]
        }
    ]
});

/** The published example every case reads. */
const PUBLISHED: Example = {
    id: 'ex-1',
    title: 'Training a puppy',
    body: 'Start with a treat.',
    status: 'published',
    userId: 'u-1',
    ownerName: 'ada',
    publishedAt: '2026-01-12T09:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z'
};

/**
 * Mounts the page for `ex-1` with the store's public call answered BEFORE mount: the view reads
 * as soon as it is set up.
 *
 * @param answer - What the public read resolves or rejects with.
 * @returns The wrapper and the spy.
 */
const mountPage = (answer: () => Promise<Example | undefined>) => {
    const fetchPublished = vi.spyOn(useExampleStore(), 'fetchPublished').mockImplementation(answer);
    const wrapper = mount(ExamplePublished, {
        props: { id: PUBLISHED.id },
        attachTo: document.body,
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, fetchPublished };
};

beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    return loadLocale('en').then(() =>
        router.push(`/en/examples/published/${PUBLISHED.id}`).then(() => router.isReady())
    );
});

describe('ExamplePublished', () => {
    it('shows the example it was given, with who published it', () => {
        const { wrapper, fetchPublished } = mountPage(() => Promise.resolve(PUBLISHED));

        return flushPromises().then(() => {
            expect(fetchPublished).toHaveBeenCalledWith('ex-1');
            expect(wrapper.get('[data-test=example-published-body]').text()).toBe(
                'Start with a treat.'
            );
            expect(wrapper.text()).toContain('Published by ada');
        });
    });

    it('sends the visitor to the Error page when the server answers 404', () => {
        // The API's refusal travels as the reject envelope; an `Error` carrying it satisfies the
        // lint rule about rejection reasons without changing what the page reads (`status`).
        mountPage(() =>
            Promise.reject(
                Object.assign(new Error('Not Found'), {
                    success: false,
                    status: 404,
                    errors: [{ code: 'NOT_FOUND', message: 'The example was not found.' }]
                })
            )
        );

        return vi
            .waitFor(() => {
                if (router.currentRoute.value.name !== 'Error')
                    throw new Error('not redirected yet');
            })
            .then(() => {
                expect(router.currentRoute.value.name).toBe('Error');
            });
    });

    it('shows nothing of the example while it loads', () => {
        const { wrapper } = mountPage(() => new Promise(() => undefined));

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=example-published-body]').exists()).toBe(false);
        });
    });
});
