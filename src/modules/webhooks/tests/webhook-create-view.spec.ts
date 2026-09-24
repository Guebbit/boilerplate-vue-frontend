/**
 * @module
 * Mounts the real subscription-create page against a real, memory-history router: what the form
 * refuses before anything is sent, the exact payload it sends, the one-time secret shown before
 * the visitor leaves, and where `Done` takes them. The store's calls are spied at the store — the
 * HTTP layer under them has its own suite.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import WebhookCreate from '@/modules/webhooks/views/WebhookCreate.vue';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { WebhookSubscriptionCreated } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this suite enables — `Done` navigates for real.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Stands in for Vuetify's multi-select: choosing through its teleported menu is Vuetify's own
 * behaviour, not this page's. A change emits the one event type this suite picks.
 */
const V_SELECT_STUB = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: "<select multiple @change=\"$emit('update:modelValue', ['order.paid'])\" />"
};

/**
 * What the API answers a create with: the subscription, plus its secret, exactly once. Typed
 * against the generated contract, so a field it adds or requires fails compilation here.
 */
const CREATED: WebhookSubscriptionCreated = {
    id: 'sub-1',
    url: 'https://hooks.example.com/in',
    description: 'Orders feed',
    eventTypes: ['order.paid'],
    enabled: true,
    consecutiveFailures: 0,
    secretIds: ['sec-1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    secret: 'whsec_shown_once'
};

/**
 * Mounts the page with its store calls spied BEFORE mount — the view destructures them at setup.
 *
 * @returns The wrapper and the create spy each case configures.
 */
const mountPage = () => {
    const store = useWebhooksStore();
    vi.spyOn(store, 'fetchEventCatalogue').mockResolvedValue(undefined);
    const create = vi.spyOn(store, 'createSubscription');

    const wrapper = mount(WebhookCreate, {
        attachTo: document.body,
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' }, VSelect: V_SELECT_STUB }
        }
    });
    return { wrapper, create };
};

/**
 * Fills every field with a valid value and submits.
 *
 * @param wrapper - The mounted page.
 * @param url - What goes in the URL field.
 */
const fillAndSubmit = (wrapper: ReturnType<typeof mountPage>['wrapper'], url: string) =>
    wrapper
        .get('[data-test=webhook-url] input')
        .setValue(url)
        .then(() => wrapper.get('[data-test=webhook-description] input').setValue('Orders feed'))
        .then(() => wrapper.get('select').trigger('change'))
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);

beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    return loadLocale('en').then(() =>
        router.push('/en/webhooks/subscriptions/create').then(() => router.isReady())
    );
});

describe('WebhookCreate', () => {
    it('refuses a URL that is not one, and sends nothing', () => {
        const { wrapper, create } = mountPage();

        return fillAndSubmit(wrapper, 'not a url').then(() => {
            expect(create).not.toHaveBeenCalled();
            expect(wrapper.find('[data-test=webhook-url] .v-messages').text()).not.toBe('');
        });
    });

    it('sends exactly what was typed, then reveals the secret before leaving the page', () => {
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(CREATED);

        return fillAndSubmit(wrapper, 'https://hooks.example.com/in').then(() => {
            expect(create).toHaveBeenCalledWith({
                url: 'https://hooks.example.com/in',
                description: 'Orders feed',
                eventTypes: ['order.paid']
            });
            // Still here: the secret is shown once, and only `Done` moves on.
            expect(router.currentRoute.value.fullPath).toBe('/en/webhooks/subscriptions/create');
            expect(
                document.body.querySelector('[data-test=secret-reveal-value]')?.textContent?.trim()
            ).toBe('whsec_shown_once');
        });
    });

    it('opens the new subscription once the secret is acknowledged', () => {
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(CREATED);

        return fillAndSubmit(wrapper, 'https://hooks.example.com/in')
            .then(() => {
                // The modal is teleported to <body>: `Done` stays disabled until the visitor
                // confirms having saved the secret — the whole point of showing it once.
                const confirm = document.body.querySelector<HTMLInputElement>(
                    '[data-test=secret-reveal-confirm-saved] input'
                );
                confirm?.click();
                return flushPromises();
            })
            .then(() => {
                document.body
                    .querySelector<HTMLButtonElement>('[data-test=secret-reveal-continue]')
                    ?.click();
                return vi.waitFor(() => {
                    if (!router.currentRoute.value.fullPath.endsWith('/sub-1'))
                        throw new Error('still on the create page');
                });
            })
            .then(() => {
                expect(router.currentRoute.value.fullPath).toBe('/en/webhooks/subscriptions/sub-1');
                wrapper.unmount();
            });
    });

    it('blocks the form in place when the API refuses the create', () => {
        const { wrapper, create } = mountPage();
        create.mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server error',
            errors: [{ code: 'INTERNAL', message: 'Server error' }]
        });

        return fillAndSubmit(wrapper, 'https://hooks.example.com/in').then(() => {
            expect(wrapper.find('[data-test=webhook-create-error]').exists()).toBe(true);
            expect(router.currentRoute.value.fullPath).toBe('/en/webhooks/subscriptions/create');
        });
    });
});
