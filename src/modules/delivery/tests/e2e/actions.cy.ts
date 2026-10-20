/**
 * @module
 * The fulfilment screen's failure rows, run through the shared `actionTable` runner: shipping or
 * holding a group answered with a server fault keeps the dialog open with what was typed, shows the
 * alert, and a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

/** A paid order with one shipping group, read by its seeded name. */
const paidOrderPage = () => cy.subjectId('order.paidExpress').then((id) => `/en/orders/${id}`);

actionTable('delivery', [
    {
        name: 'a failed shipment keeps the dialog and the tracking code, and a retry succeeds',
        persona: 'warehouse',
        route: paidOrderPage,
        prepare: () => {
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=open-ship]').first().click();
            cy.get('[data-test=ship-tracking-code] input').type('1Z-ACTIONS-0001');
        },
        trigger: () => {
            cy.get('[data-test=ship-submit]').should('not.be.disabled').click();
        },
        intercept: {
            method: 'POST',
            url: '**/delivery/fulfillment-orders/*/shipments',
            operation: '/delivery/fulfillment-orders/{id}/shipments'
        },
        kind: 'dialog',
        alert: 'ship-items-error',
        dialog: '[data-test=ship-submit]',
        control: '[data-test=ship-submit]'
    },
    {
        name: 'a failed hold keeps the dialog and the reason, and a retry succeeds',
        persona: 'warehouse',
        route: paidOrderPage,
        prepare: () => {
            cy.get('[data-test=open-hold]').click();
            cy.get('[data-test=hold-reason]').click();
            cy.get('[role=listbox] [role=option]').contains('High risk').click();
        },
        trigger: () => {
            cy.get('[data-test=hold-submit]').should('not.be.disabled').click();
        },
        intercept: {
            method: 'POST',
            url: '**/delivery/fulfillment-orders/*/hold',
            operation: '/delivery/fulfillment-orders/{id}/hold'
        },
        kind: 'dialog',
        alert: 'hold-error',
        dialog: '[data-test=hold-dialog]',
        control: '[data-test=hold-submit]'
    }
]);
