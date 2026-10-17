/**
 * @module
 * The orders module's failure rows, run through the shared `actionTable` runner: the staff edit
 * form is submitted with its request answered by a server fault, and must show the alert, keep
 * what was typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import { SearchOrdersResponse } from '../../../../../contracts/rest/schemas.zod';

/** A list answer with nothing in it, for the list read the empty rows stub. */
const emptyPage = {
    success: true,
    status: 200,
    message: 'OK',
    data: { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }
};

actionTable('orders', [
    {
        name: 'a failed edit keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: () => cy.subjectId('order.otherPending').then((id) => `/en/orders/${id}/edit`),
        prepare: () => {
            cy.get('[data-test=order-edit-email] input').should('not.have.value', '');
            cy.get('[data-test=order-edit-email] input').clear();
            cy.get('[data-test=order-edit-email] input').type('typed-before-the-fault@example.com');
        },
        trigger: () => {
            cy.get('form').first().submit();
        },
        intercept: { method: 'PATCH', url: '**/orders/*', operation: '/orders/{id}' },
        kind: 'form',
        alert: 'order-edit-form-error',
        message: 'The save failed'
    },
    {
        name: 'a customer with no orders sees the empty state and its way to the cart',
        persona: 'user',
        route: '/en/orders',
        intercept: { method: 'POST', url: '**/orders/search', operation: '/orders/search' },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: SearchOrdersResponse,
        empty: {
            copy: '.v-empty-state',
            rows: '[data-test=row-view]',
            cta: { selector: '.v-empty-state a', path: '/en/cart' }
        }
    },
    {
        name: 'staff with no orders to list see the staff empty state, with no way to the cart',
        persona: 'admin',
        route: '/en/sales/orders',
        intercept: { method: 'POST', url: '**/orders/search', operation: '/orders/search' },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: SearchOrdersResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=row-view]' }
    },
    {
        name: 'a slow record read leaves the form closed until it lands, and a refetch keeps what was typed',
        persona: 'admin',
        route: () => cy.subjectId('order.otherPending').then((id) => `/en/orders/${id}/edit`),
        intercept: { method: 'GET', url: '**/orders/*', operation: '/orders/{id}' },
        kind: 'slow',
        field: 'order-edit-email',
        typed: 'typed-before-the-switch@example.com'
    },
    {
        name: 'a failed hold keeps its dialog open with what was typed, and a retry succeeds',
        persona: 'admin',
        route: () => cy.subjectId('order.paidExpress').then((id) => `/en/orders/${id}`),
        prepare: () => {
            cy.get('[data-test=open-hold]').click();
            cy.pickOption('[data-test=hold-reason]', 'Incorrect address');
            cy.get('[data-test=hold-note] textarea').type('typed before the fault');
        },
        trigger: () => {
            cy.get('[data-test=hold-submit]').click();
        },
        intercept: {
            method: 'POST',
            url: '**/delivery/fulfillment-orders/*/hold',
            operation: '/delivery/fulfillment-orders/{id}/hold'
        },
        kind: 'dialog',
        alert: 'hold-error',
        message: 'The hold failed',
        dialog: '[data-test=hold-dialog]',
        control: '[data-test=hold-submit]'
    },
    {
        name: 'a failed shipment keeps its dialog open with the tracking code, and a retry succeeds',
        persona: 'admin',
        route: () => cy.subjectId('order.paidExpress').then((id) => `/en/orders/${id}`),
        prepare: () => {
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=open-ship]').click();
            cy.get('[data-test=ship-tracking-code] input').type('TRACK-BEFORE-THE-FAULT');
        },
        trigger: () => {
            cy.get('[data-test=ship-submit]').click();
        },
        intercept: {
            method: 'POST',
            url: '**/delivery/fulfillment-orders/*/shipments',
            operation: '/delivery/fulfillment-orders/{id}/shipments'
        },
        kind: 'dialog',
        alert: 'ship-items-error',
        message: 'The shipment failed',
        dialog: '[data-test=ship-submit]',
        control: '[data-test=ship-submit]'
    },
    {
        name: 'a failed cancel keeps the order and its button, and a retry succeeds',
        persona: 'user',
        route: () => cy.subjectId('order.paid').then((id) => `/en/orders/${id}`),
        trigger: () => {
            cy.get('[data-test=order-cancel]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: {
            method: 'POST',
            url: '**/orders/*/cancel',
            operation: '/orders/{id}/cancel'
        },
        kind: 'row',
        alert: 'order-cancel-error',
        message: 'The cancel failed',
        listed: '[data-test=order-cancel]'
    }
]);
