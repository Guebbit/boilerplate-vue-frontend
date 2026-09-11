/**
 * @module
 * Cypress a11y sweep route list for the webhooks module, run through the shared `sweepA11y`
 * helper as the admin.
 *
 * Co-located so deleting the module deletes its a11y coverage with it —
 * `tests/cross-cutting/a11y-coverage.spec.ts` asserts every routed module has one of these, so
 * the split cannot quietly lose a domain.
 *
 * Detail and edit pages need a subscription id, and there is no seeded demo fixture for one (this
 * is a from-scratch module) — `cy.createWebhookSubscription()` makes one server-side as admin
 * rather than looking one up, same reasoning `cy.createProduct()` documents.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** iPhone 14-class portrait — the width `DataTable.vue`'s `mobile-breakpoint` stacks rows below. */
const PHONE = [390, 844] as const;

/**
 * Detail-page URL for a freshly created subscription.
 */
const webhookDetail = () =>
    cy
        .createWebhookSubscription()
        .then((subscription) => `/en/webhooks/subscriptions/${subscription.id}`);

/**
 * Edit-page URL for a freshly created subscription.
 */
const webhookEdit = () =>
    cy
        .createWebhookSubscription()
        .then((subscription) => `/en/webhooks/subscriptions/${subscription.id}/edit`);

/**
 * Delivery-log URL pre-filtered to a freshly created subscription — the deep-linked state
 * `WebhookTarget.vue`'s "view deliveries" button reaches, and the reason this route reads its
 * filters from the query string at all.
 */
const webhookDeliveriesFiltered = () =>
    cy
        .createWebhookSubscription()
        .then((subscription) => `/en/webhooks/deliveries?subscriptionId=${subscription.id}`);

sweepA11y(
    'webhooks',
    [
        ['subscriptions list', '/en/webhooks/subscriptions'],
        // The table stacked into cards below `sm` — the layout the desktop sweep never sees.
        {
            name: 'subscriptions list, phone viewport',
            route: '/en/webhooks/subscriptions',
            viewport: PHONE
        },
        ['subscription create', '/en/webhooks/subscriptions/create'],
        {
            // Submitted empty: every field shows its error, and an error message has to be
            // associated with its field (`aria-describedby`) and announced, not only coloured.
            name: 'subscription create, submitted empty',
            route: '/en/webhooks/subscriptions/create',
            prepare: () => {
                cy.get('form button[type=submit]').click();
                cy.get('.v-messages__message').should('be.visible');
            }
        },
        ['subscription detail', webhookDetail],
        ['subscription edit', webhookEdit],
        ['delivery log', '/en/webhooks/deliveries'],
        { name: 'delivery log, filtered by subscription', route: webhookDeliveriesFiltered }
    ],
    'owner'
);
