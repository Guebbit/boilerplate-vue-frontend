/**
 * @module
 * `WebhookTarget`'s two confirm-then-write controls, removing a signing secret and deleting the
 * subscription: a second press made before the first answer must not ask again or write again.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import WebhookTarget from '../views/WebhookTarget.vue';
import { useWebhooksStore } from '../store';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { WebhookSubscription } from '@types';

wireModulesIntoCore();

/** The real route tree, so the page's links resolve. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The subscription the page shows. */
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
 * Mounts the page on a seeded subscription, with the dialog answering "yes".
 *
 * @returns The wrapper, the two spied writes and the spied question.
 */
const mountPage = () => {
    const store = useWebhooksStore();
    store.addSubscriptionRecord({ ...SUBSCRIPTION });
    const removeSecret = vi.spyOn(store, 'removeSecret').mockResolvedValue(undefined);
    const deleteSubscription = vi.spyOn(store, 'deleteSubscription').mockResolvedValue(undefined);
    const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
    const wrapper = mount(WebhookTarget, {
        props: { id: SUBSCRIPTION.id },
        global: { plugins: [router, vuetify, i18n] }
    });
    return { wrapper, removeSecret, deleteSubscription, confirm };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push(`/en/webhooks/subscriptions/${SUBSCRIPTION.id}`).then(() => router.isReady())
    );
});

describe('a double press on a webhook confirm-then-write control', () => {
    it('removes a secret once', async () => {
        const { wrapper, removeSecret, confirm } = mountPage();
        await flushPromises();
        const button = wrapper.get('[data-test=webhook-secret-remove]');

        void button.trigger('click');
        void button.trigger('click');
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(removeSecret).toHaveBeenCalledTimes(1);
    });

    it('deletes the subscription once', async () => {
        const { wrapper, deleteSubscription, confirm } = mountPage();
        await flushPromises();
        const button = wrapper.get('[data-test=webhook-delete]');

        void button.trigger('click');
        void button.trigger('click');
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(deleteSubscription).toHaveBeenCalledTimes(1);
    });
});
