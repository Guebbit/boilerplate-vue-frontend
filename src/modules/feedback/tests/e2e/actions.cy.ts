/**
 * @module
 * The feedback inbox's failure rows, run through the shared `actionTable` runner: deleting a
 * message answered with a server fault keeps it listed and shows the alert, and a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import { SearchFeedbackRequestsResponse } from '../../../../../contracts/rest/schemas.zod';

actionTable('feedback', [
    {
        name: 'a failed delete keeps the message listed and shows the alert, and a retry succeeds',
        persona: 'admin',
        // The seeded inbox is empty: a visitor writes in through the public door first.
        route: () =>
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.request({
                    method: 'POST',
                    url: `${String(apiUrl)}/feedback/contact`,
                    headers: { 'Idempotency-Key': `actions-${String(Date.now())}` },
                    body: {
                        email: 'visitor@example.com',
                        subject: 'A question for the table',
                        message: 'Written so the inbox has a message to delete.'
                    }
                });
                return cy.wrap('/en/feedback', { log: false });
            }),
        trigger: () => {
            cy.get('[data-test=feedback-delete]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'DELETE', url: '**/feedback/*', operation: '/feedback/{id}' },
        kind: 'row',
        alert: 'feedback-row-action-error',
        message: 'The delete failed',
        listed: '[data-test=feedback-item]'
    },
    {
        name: 'an inbox with no messages shows its empty state',
        persona: 'admin',
        route: '/en/feedback',
        intercept: { method: 'POST', url: '**/feedback/search', operation: '/feedback/search' },
        kind: 'empty',
        emptyBody: {
            success: true,
            status: 200,
            message: 'OK',
            data: { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }
        },
        emptySchema: SearchFeedbackRequestsResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=feedback-item]' }
    }
]);
