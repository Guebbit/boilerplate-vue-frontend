/**
 * @module
 * Route table for the webhooks module: each record pairs a path with the lazy-loaded view and the
 * rule the router guard checks. Each screen names the action it performs — reading the list is not
 * the same permission as minting a subscription — so a read-only role reaches the log and stops
 * there.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the webhooks module, mounted under the app's module registry.
 */
export default [
    {
        path: 'webhooks/subscriptions',
        name: 'WebhooksList',
        meta: {
            access: 'auth',
            can: ['read', 'WebhookSubscription'],
            title: 'webhooks-list-page.page-title'
        },
        component: () => import('@/modules/webhooks/views/WebhooksList.vue')
    },
    {
        path: 'webhooks/subscriptions/create',
        name: 'WebhookCreate',
        meta: {
            access: 'auth',
            can: ['create', 'WebhookSubscription'],
            title: 'webhook-create-page.page-title'
        },
        component: () => import('@/modules/webhooks/views/WebhookCreate.vue')
    },
    {
        path: 'webhooks/subscriptions/:id',
        name: 'WebhookTarget',
        meta: {
            access: 'auth',
            can: ['read', 'WebhookSubscription'],
            title: 'webhook-target-page.page-title'
        },
        component: () => import('@/modules/webhooks/views/WebhookTarget.vue'),
        props: true
    },
    {
        path: 'webhooks/subscriptions/:id/edit',
        name: 'WebhookEdit',
        meta: {
            access: 'auth',
            can: ['update', 'WebhookSubscription'],
            title: 'webhook-edit-page.page-title'
        },
        component: () => import('@/modules/webhooks/views/WebhookEdit.vue'),
        props: true
    },
    {
        path: 'webhooks/deliveries',
        name: 'WebhookDeliveries',
        meta: {
            access: 'auth',
            can: ['read', 'WebhookSubscription'],
            title: 'webhook-deliveries-page.page-title'
        },
        component: () => import('@/modules/webhooks/views/WebhookDeliveries.vue')
    }
] satisfies RouteRecordRaw[];
