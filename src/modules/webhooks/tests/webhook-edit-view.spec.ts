/**
 * @module
 * Mounts the real subscription-edit page against a real, memory-history router: what it sends
 * when a `description` the visitor clears has to become `null` (D17c's own "empty string is
 * invalid, `null` clears" rule), and what it sends when the field is left untouched. Hydration
 * comes from the store's own cache (there is no `GET .../subscriptions/{id}`), seeded by hand the
 * same way `store.spec.ts`'s `watchSubscription` cases are.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import WebhookEdit from '@/modules/webhooks/views/WebhookEdit.vue';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { WebhookSubscription } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Stands in for Vuetify's multi-select — same stub `webhook-create-view.spec.ts` uses.
 */
const V_SELECT_STUB = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: "<select multiple @change=\"$emit('update:modelValue', ['order.paid'])\" />"
};

/** The record every test loads and edits, carrying a description to clear. */
const SUBSCRIPTION: WebhookSubscription = {
    id: 'sub-1',
    url: 'https://hooks.example.com/in',
    description: 'Orders feed',
    eventTypes: ['order.paid'],
    enabled: true,
    consecutiveFailures: 0,
    secretIds: ['sec-1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

/**
 * Mounts the page for `sub-1`, seeding the store's cache by hand — the way a prior list load
 * would leave it, since there is no per-id GET this page could call instead.
 *
 * @returns The wrapper and the spied `updateSubscription`.
 */
const mountPage = () => {
    const store = useWebhooksStore();
    store.addSubscriptionRecord({ ...SUBSCRIPTION });
    vi.spyOn(store, 'fetchEventCatalogue').mockResolvedValue(undefined);
    const update = vi.spyOn(store, 'updateSubscription').mockResolvedValue(SUBSCRIPTION);

    const wrapper = mount(WebhookEdit, {
        props: { id: SUBSCRIPTION.id },
        attachTo: document.body,
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' }, VSelect: V_SELECT_STUB }
        }
    });
    return { wrapper, update };
};

beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    return loadLocale('en').then(() =>
        router
            .push(`/en/webhooks/subscriptions/${SUBSCRIPTION.id}/edit`)
            .then(() => router.isReady())
    );
});

describe('WebhookEdit', () => {
    it('sends null for a description the visitor cleared, never the empty string', () => {
        const { wrapper, update } = mountPage();

        return wrapper
            .get('[data-test=webhook-description] input')
            .setValue('')
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(update).toHaveBeenCalledWith(
                    SUBSCRIPTION.id,
                    expect.objectContaining({ description: null })
                );
            });
    });

    it('sends the description back unchanged when the field was left alone', () => {
        const { wrapper, update } = mountPage();

        return wrapper
            .get('form')
            .trigger('submit')
            .then(flushPromises)
            .then(() => {
                expect(update).toHaveBeenCalledWith(
                    SUBSCRIPTION.id,
                    expect.objectContaining({ description: 'Orders feed' })
                );
            });
    });
});
