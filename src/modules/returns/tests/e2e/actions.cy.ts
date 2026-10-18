/**
 * @module
 * The returns module's failure rows, run through the shared `actionTable` runner: the buyer's
 * withdrawal answered with a server fault keeps its button and shows the alert, and a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

actionTable('returns', [
    {
        name: 'a failed withdrawal keeps the button and shows the alert, and a retry succeeds',
        persona: 'user',
        route: () => cy.subjectId('order.paid').then((id) => `/en/orders/${id}`),
        trigger: () => {
            cy.get('[data-test=withdraw-button]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'POST', url: '**/returns', operation: '/returns' },
        kind: 'row',
        alert: 'withdraw-error',
        message: 'The withdrawal failed',
        listed: '[data-test=withdraw-button]'
    }
]);
