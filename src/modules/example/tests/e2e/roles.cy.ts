/**
 * @module
 * Who may open the example pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('example', [
    {
        name: 'examples list',
        route: '/en/examples',
        can: ['read', 'Example'],
        pageRoot: '#examples-list-page',
        buttons: [{ selector: '[data-test=example-create]', can: ['create', 'Example'] }]
    },
    {
        name: 'example create',
        route: '/en/examples/create',
        can: ['create', 'Example'],
        pageRoot: '#example-create-page'
    }
]);

/** The admin's seeded published example: a moderator may read it, and it is not theirs. */
const ADMIN_PUBLISHED = '65e1a0000000000000000e04';

describe('example, another author’s record', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('lets a moderator read it but offers no edit, delete or status move', () => {
        // The moderator holds `display:Example` (read everyone's) but `update`/`delete` only on
        // their own rows, so the row's `actions` switch the controls off.
        cy.loginAs('moderator');
        cy.visit(`/en/examples/${ADMIN_PUBLISHED}`);

        cy.get('#example-target').should('exist');
        cy.get('[data-test=example-go-to-edit]').should('not.exist');
        cy.get('[data-test=example-delete]').should('not.exist');
        cy.get('[data-test=example-status-actions]').should('not.exist');
    });
});
