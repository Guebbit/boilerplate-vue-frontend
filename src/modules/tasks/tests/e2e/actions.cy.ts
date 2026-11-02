/**
 * @module
 * The tasks page's failure rows, run through the shared `actionTable` runner: deleting a
 * message answered with a server fault keeps it listed and shows the alert, and a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import { SearchTasksResponse } from '../../../../../contracts/rest/schemas.zod';

actionTable('tasks', [
    {
        name: 'a failed delete keeps the message listed and shows the alert, and a retry succeeds',
        persona: 'admin',
        // The seeded inbox is empty: a visitor writes in through the public door first.
        route: () =>
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.request({
                    method: 'POST',
                    url: `${String(apiUrl)}/tasks`,
                    headers: { 'Idempotency-Key': `actions-${String(Date.now())}` },
                    body: {
                        email: 'visitor@example.com',
                        subject: 'A question for the table',
                        message: 'Written so the inbox has a message to delete.'
                    }
                });
                return cy.wrap('/en/tasks', { log: false });
            }),
        trigger: () => {
            cy.get('[data-test=task-delete]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'DELETE', url: '**/tasks/*', operation: '/tasks/{id}' },
        kind: 'row',
        alert: 'task-row-action-error',
        message: 'The delete failed',
        listed: '[data-test=task-item]'
    },
    {
        name: 'an inbox with no messages shows its empty state',
        persona: 'admin',
        route: '/en/tasks',
        intercept: { method: 'POST', url: '**/tasks/search', operation: '/tasks/search' },
        kind: 'empty',
        emptyBody: { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } },
        emptySchema: SearchTasksResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=task-item]' }
    }
]);
