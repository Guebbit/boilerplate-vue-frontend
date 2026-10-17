/**
 * @module
 * The webhooks module's failure rows, run through the shared `actionTable` runner: each form is
 * submitted with its request answered by a server fault, and must show the alert, keep what was
 * typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import { sinkEndpoint } from '../../../../../tests/support/e2e/integrator';

/** A name unique per run, so two specs on one backend cannot collide. */
const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

actionTable('webhooks', [
    {
        name: 'a failed create keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: '/en/webhooks/subscriptions/create',
        prepare: () => {
            sinkEndpoint(`/hook-${unique()}`).then((url) => {
                cy.get('[data-test=webhook-url] input').type(url);
            });
            cy.get('[data-test=webhook-description] input').type('typed before the fault');
            cy.pickOption('[data-test=webhook-event-types]', 'order.created');
            cy.get('body').type('{esc}');
        },
        trigger: () => {
            cy.get('form').submit();
        },
        intercept: {
            method: 'POST',
            url: '**/webhooks/subscriptions',
            operation: '/webhooks/subscriptions'
        },
        kind: 'form',
        alert: 'webhook-create-error',
        message: 'The create failed'
    },
    {
        name: 'a failed edit keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: () =>
            sinkEndpoint(`/hook-${unique()}`)
                .then((url) => cy.createWebhookSubscription({ url, eventTypes: ['order.created'] }))
                .then((subscription) => `/en/webhooks/subscriptions/${subscription.id}/edit`),
        prepare: () => {
            cy.get('[data-test=webhook-url] input').should('not.have.value', '');
            cy.get('[data-test=webhook-description] input').type('typed before the fault');
        },
        trigger: () => {
            cy.get('form').submit();
        },
        intercept: {
            method: 'PATCH',
            url: '**/webhooks/subscriptions/*',
            operation: '/webhooks/subscriptions/{id}'
        },
        kind: 'form',
        alert: 'webhook-edit-form-error',
        message: 'The save failed'
    },
    {
        name: 'a failed delete keeps the row listed and shows the alert, and a retry succeeds',
        persona: 'admin',
        route: () =>
            sinkEndpoint(`/hook-${unique()}`)
                .then((url) => cy.createWebhookSubscription({ url, eventTypes: ['order.created'] }))
                .then(() => '/en/webhooks/subscriptions'),
        trigger: () => {
            cy.get('[data-test=row-delete]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: {
            method: 'DELETE',
            url: '**/webhooks/subscriptions/*',
            operation: '/webhooks/subscriptions/{id}'
        },
        kind: 'row',
        alert: 'webhooks-list-row-action-error',
        message: 'The delete failed',
        listed: '[data-test=list-row]'
    }
]);
