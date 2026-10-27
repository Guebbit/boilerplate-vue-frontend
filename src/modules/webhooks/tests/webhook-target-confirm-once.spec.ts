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
    secretIds: ['sec-1', 'sec-2'],
    retiringSecrets: [{ id: 'sec-1', retiresAt: '2026-01-02T00:00:00.000Z' }],
    actions: {
        update: true,
        delete: true,
        enable: false,
        disable: true,
        createSecret: true,
        removeSecret: true
    },
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
    // The record is already in the cache; the page's own load is not what these cases are about.
    vi.spyOn(store, 'watchSubscription').mockReturnValue(vi.fn() as never);
    store.selectedSubscriptionId = SUBSCRIPTION.id;
    const removeSecret = vi.spyOn(store, 'removeSecret').mockResolvedValue(undefined);
    const deleteSubscription = vi.spyOn(store, 'deleteSubscription').mockResolvedValue(undefined);
    const disableSubscription = vi.spyOn(store, 'disableSubscription').mockResolvedValue(undefined);
    const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
    const wrapper = mount(WebhookTarget, {
        props: { id: SUBSCRIPTION.id },
        global: { plugins: [router, vuetify, i18n] }
    });
    return { wrapper, removeSecret, deleteSubscription, disableSubscription, confirm, store };
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
        const button = wrapper.findAll('[data-test=webhook-secret-remove]')[0];

        await Promise.all([button.trigger('click'), button.trigger('click')]);
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(removeSecret).toHaveBeenCalledTimes(1);
    });

    it('deletes the subscription once', async () => {
        const { wrapper, deleteSubscription, confirm } = mountPage();
        await flushPromises();
        const button = wrapper.get('[data-test=webhook-delete]');

        await Promise.all([button.trigger('click'), button.trigger('click')]);
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(deleteSubscription).toHaveBeenCalledTimes(1);
    });

    it('pauses the subscription once', async () => {
        const { wrapper, disableSubscription, confirm } = mountPage();
        await flushPromises();
        const button = wrapper.get('[data-test=webhook-disable]');

        await Promise.all([button.trigger('click'), button.trigger('click')]);
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(disableSubscription).toHaveBeenCalledTimes(1);
    });
});

describe('what the page offers, by the record’s own actions', () => {
    it('shows when each superseded secret stops signing, and calls the newest current', async () => {
        const { wrapper } = mountPage();
        await flushPromises();

        const cells = wrapper
            .findAll('[data-test=webhook-secret-retires]')
            .map((cell) => cell.text());

        expect(cells[0]).not.toBe('Current');
        expect(cells[0]).toContain('2026');
        expect(cells[1]).toBe('Current');
    });

    it('offers enable, not disable, on a switched-off subscription, and says who switched it off', async () => {
        const { wrapper, store } = mountPage();
        store.addSubscriptionRecord({
            ...SUBSCRIPTION,
            enabled: false,
            disabledAt: '2026-02-01T00:00:00.000Z',
            autoDisabledAt: '2026-02-01T00:00:00.000Z',
            actions: { ...SUBSCRIPTION.actions, enable: true, disable: false }
        });
        await flushPromises();

        expect(wrapper.find('[data-test=webhook-enable]').exists()).toBe(true);
        expect(wrapper.find('[data-test=webhook-disable]').exists()).toBe(false);
        expect(wrapper.get('[data-test=webhook-status]').attributes('data-status')).toBe(
            'auto-disabled'
        );
        expect(wrapper.get('[data-test=webhook-status-intro]').text()).toContain('repeated');
    });

    it('hides every write the record says the server would refuse', async () => {
        const { wrapper, store } = mountPage();
        store.addSubscriptionRecord({
            ...SUBSCRIPTION,
            actions: {
                update: false,
                delete: false,
                enable: false,
                disable: false,
                createSecret: false,
                removeSecret: false
            }
        });
        await flushPromises();

        const present = [
            'webhook-delete',
            'webhook-enable',
            'webhook-disable',
            'webhook-rotate-secret',
            'webhook-secret-remove'
        ].filter((hook) => wrapper.find(`[data-test=${hook}]`).exists());
        expect(present).toEqual([]);
    });
});
