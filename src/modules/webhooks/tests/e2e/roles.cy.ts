/**
 * @module
 * Who may open the webhook pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('webhooks', [
    {
        name: 'subscriptions',
        route: '/en/webhooks/subscriptions',
        can: ['read', 'WebhookSubscription'],
        menuHref: '/en/webhooks/subscriptions',
        pageRoot: '#webhooks-list-page'
    },
    {
        name: 'subscription create',
        route: '/en/webhooks/subscriptions/create',
        can: ['create', 'WebhookSubscription'],
        pageRoot: '#webhook-create-page'
    },
    {
        name: 'deliveries',
        route: '/en/webhooks/deliveries',
        can: ['read', 'WebhookSubscription'],
        menuHref: '/en/webhooks/deliveries',
        pageRoot: '#webhook-deliveries-page'
    }
]);
