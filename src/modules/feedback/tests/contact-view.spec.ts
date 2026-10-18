/**
 * @module
 * Mounts the real contact page: an order page's link pre-fills the category and the order number,
 * a link naming something the contract does not know is ignored, and what the visitor leaves
 * alone is not sent. `submitContact` is spied at the feedback store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Contact from '../views/Contact.vue';
import { useFeedbackStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * The real app router — the page reads the address it was opened on.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Opens the page on `address` and mounts it, with the store call spied BEFORE mount.
 *
 * @param address - the path and query the visitor arrived on
 * @returns The wrapper and the spy each case configures.
 */
const openContact = (address: string) => {
    const submit = vi.spyOn(useFeedbackStore(), 'submitContact').mockResolvedValue(undefined);

    return router
        .push(address)
        .then(() => router.isReady())
        .then(() => ({
            submit,
            wrapper: mount(Contact, {
                global: {
                    plugins: [router, vuetify, i18n],
                    // HumanCheck's own branching is tests/unit/ui/human-check.spec.ts's job, and the
                    // real thing would fire a real GET /antibot/config.
                    stubs: { HumanCheck: { template: '<div />' } }
                }
            })
        }));
};

/**
 * Fills the required fields and submits.
 *
 * @param wrapper - the mounted page
 */
const fillAndSend = (wrapper: Awaited<ReturnType<typeof openContact>>['wrapper']) =>
    wrapper
        .get('[data-test=contact-email] input')
        .setValue('ada@example.com')
        .then(() => wrapper.get('[data-test=contact-subject] input').setValue('About my order'))
        .then(() =>
            wrapper
                .get('[data-test=contact-message] textarea')
                .setValue('Please cancel it, thanks.')
        )
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('Contact', () => {
    it('arrives filled in from an order page’s link', () =>
        openContact('/en/contact?category=cancellation&order=ORD-1042')
            .then(({ wrapper, submit }) => fillAndSend(wrapper).then(() => submit))
            .then((submit) => {
                const sent = vi.mocked(submit).mock.calls[0]?.[0];

                expect(sent).toMatchObject({ category: 'cancellation', orderNumber: 'ORD-1042' });
            }));

    it('ignores a category the contract does not know', () =>
        openContact('/en/contact?category=refunds-please')
            .then(({ wrapper, submit }) => fillAndSend(wrapper).then(() => submit))
            .then((submit) => {
                const sent = vi.mocked(submit).mock.calls[0]?.[0];

                expect(sent?.category).toBeUndefined();
            }));

    it('sends neither when the visitor chose nothing and the link named nothing', () =>
        openContact('/en/contact')
            .then(({ wrapper, submit }) => fillAndSend(wrapper).then(() => submit))
            .then((submit) => {
                const sent = vi.mocked(submit).mock.calls[0]?.[0];

                expect(sent).toBeDefined();
                expect(sent?.category).toBeUndefined();
                expect(sent?.orderNumber).toBeUndefined();
            }));
});
