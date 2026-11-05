/**
 * @module
 * Mounts the real contact page: an order page's link pre-fills the category and the order number,
 * a link naming something the contract does not know is ignored, and what the visitor leaves
 * alone is not sent. `submitContact` is spied at the tasks store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Contact from '../views/Contact.vue';
import { useTasksStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { parseOrvalFixture } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import { configAnswer } from '../../../../tests/support/unit/config-answer.ts';
import { resetConfig } from '@/infrastructure/config.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';

wireModulesIntoCore();

// The page reads the support address from `GET /config`; the store call is spied, so this is the
// only request the page makes.
vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                configAnswer({ supportEmail: 'help@shop.example' })
            )
        )
    )
}));

/**
 * The real app router — the page reads the address it was opened on.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: '/:locale',
            component: RouterView,
            children: [
                ...collectModuleRoutes(enabledModules),
                // The privacy page belongs to the app tier, which this spec does not assemble.
                { path: 'privacy', name: 'StaticPrivacy', component: { render: () => null } }
            ]
        }
    ]
});

/**
 * Opens the page on `address` and mounts it, with the store call spied BEFORE mount.
 *
 * @param address - the path and query the visitor arrived on
 * @returns The wrapper and the spy each case configures.
 */
const openContact = (address: string) => {
    const submit = vi.spyOn(useTasksStore(), 'submitContact').mockResolvedValue(undefined);

    return router
        .push(address)
        .then(() => router.isReady())
        .then(() => ({
            submit,
            wrapper: mount(Contact, {
                global: {
                    plugins: [router, vuetify, i18n],
                    // HumanCheck's own branching is tests/unit/ui/human-check.spec.ts's job, and the
                    // real thing would fire a real GET /config.
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
    resetConfig();
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

    it('offers the support address and a privacy line under the form', () =>
        openContact('/en/contact')
            .then(({ wrapper }) => flushPromises().then(() => wrapper))
            .then((wrapper) => {
                const line = wrapper.get('[data-test=contact-write-to-us]');

                expect(line.text()).toContain('help@shop.example');
                expect(line.get('a').attributes('href')).toBe('mailto:help@shop.example');
                expect(wrapper.get('[data-test=contact-privacy-line]').find('a').exists()).toBe(
                    true
                );
            }));

    it('tells the visitor where the answer will go: the address they typed', () =>
        openContact('/en/contact')
            .then(({ wrapper }) => fillAndSend(wrapper))
            .then(() => {
                const shown = useNotificationsStore().messages.map(({ message }) => message);

                expect(shown.join(' ')).toContain('answer at ada@example.com');
            }));
});
