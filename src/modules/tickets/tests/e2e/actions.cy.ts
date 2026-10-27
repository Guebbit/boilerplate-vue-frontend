/**
 * @module
 * The ticket inbox's failure rows, run through the shared `actionTable` runner: deleting a
 * message answered with a server fault keeps it listed and shows the alert, and a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import { SearchTicketsResponse } from '../../../../../contracts/rest/schemas.zod';

actionTable('tickets', [
    {
        name: 'a failed delete keeps the message listed and shows the alert, and a retry succeeds',
        persona: 'admin',
        // The seeded inbox is empty: a visitor writes in through the public door first.
        route: () =>
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.request({
                    method: 'POST',
                    url: `${String(apiUrl)}/tickets`,
                    headers: { 'Idempotency-Key': `actions-${String(Date.now())}` },
                    body: {
                        email: 'visitor@example.com',
                        subject: 'A question for the table',
                        message: 'Written so the inbox has a message to delete.'
                    }
                });
                return cy.wrap('/en/tickets', { log: false });
            }),
        trigger: () => {
            cy.get('[data-test=ticket-delete]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'DELETE', url: '**/tickets/*', operation: '/tickets/{id}' },
        kind: 'row',
        alert: 'ticket-row-action-error',
        message: 'The delete failed',
        listed: '[data-test=ticket-item]'
    },
    {
        name: 'an inbox with no messages shows its empty state',
        persona: 'admin',
        route: '/en/tickets',
        intercept: { method: 'POST', url: '**/tickets/search', operation: '/tickets/search' },
        kind: 'empty',
        emptyBody: { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } },
        emptySchema: SearchTicketsResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=ticket-item]' }
    }
]);
