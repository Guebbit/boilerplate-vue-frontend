/**
 * @module
 * The back-in-stock requests' failure and empty rows, run through the shared `actionTable` runner:
 * asking to be told, or withdrawing the request, answered with a server fault keeps the control
 * where it was, shows the alert, and a retry works; an empty list shows its copy.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import { ListStockAlertsResponse } from '../../../../../contracts/rest/schemas.zod';

/**
 * A product nobody has in stock, made by the editor, so asking to be told is allowed.
 *
 * @returns a chain yielding the new product's id
 */
const soldOutProduct = (): Cypress.Chainable<string> =>
    cy
        .apiAs<{ id: string }>('editor', 'POST', '/products', {
            price: 19.9,
            translations: { en: { title: `Sold out ${String(Date.now())}` } }
        })
        .then((product) => String(product?.id));

actionTable('stock-alerts', [
    {
        name: 'a failed request to be told keeps the button and shows the alert, and a retry succeeds',
        persona: 'user',
        route: () => soldOutProduct().then((id) => `/en/products/${id}`),
        trigger: () => {
            cy.get('[data-test=notify-me]').click();
        },
        intercept: {
            method: 'POST',
            url: '**/stock-alerts/*',
            operation: '/stock-alerts/{productId}'
        },
        kind: 'row',
        alert: 'notify-me-error',
        listed: '[data-test=notify-me]'
    },
    {
        name: 'a failed withdrawal keeps the request listed and shows the alert, and a retry succeeds',
        persona: 'user',
        route: () =>
            soldOutProduct().then((id) =>
                cy.apiAs('user', 'POST', `/stock-alerts/${id}`).then(() => '/en/stock-alerts')
            ),
        trigger: () => {
            cy.get('[data-test=stock-alert-cancel]').first().click();
        },
        intercept: {
            method: 'DELETE',
            url: '**/stock-alerts/*',
            operation: '/stock-alerts/{productId}'
        },
        kind: 'row',
        alert: 'stock-alerts-error',
        listed: '[data-test=stock-alert-row]'
    },
    {
        name: 'a shopper with no requests sees the empty copy',
        persona: 'user',
        route: '/en/stock-alerts',
        intercept: { method: 'GET', url: '**/stock-alerts', operation: '/stock-alerts' },
        kind: 'empty',
        emptyBody: { success: true, status: 200, message: 'OK', data: { items: [] } },
        emptySchema: ListStockAlertsResponse,
        empty: { copy: '[data-test=stock-alerts-empty]', rows: '[data-test=stock-alert-row]' }
    }
]);
