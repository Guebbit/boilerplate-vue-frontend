// requires-module: account, inventory, users
/**
 * @module
 * OP19 · Nobody hands out more than they hold. A role may only be granted by someone who holds
 * every permission it carries. The moderator may make a customer a moderator but not an
 * administrator; support may grant nothing above itself; the administrator may promote a customer
 * to the warehouse, and that person's next sign-in shows the warehouse menu. A refused grant is
 * shown on the access dialog's own page, and the role is the same after a reload.
 *
 * The person acted on is the seeded `unverified` account: a customer, so the people acting are all
 * above it. The grant is on record in the audit trail.
 */
import { eventually } from '../../../support/e2e/steps';

/** The slice of a user this story reads. */
interface UserLike {
    role: string;
}

/** One audit row, as far as this story reads it. */
interface AuditRowLike {
    action: string;
    actor_role: string;
}

/**
 * The hrefs of the open administration menu, then closes it.
 *
 * @returns a chain yielding the hrefs
 */
const adminMenuLinks = (): Cypress.Chainable<string[]> => {
    cy.get('[data-test=admin-menu]').click();
    return cy
        .get('[role=menu] a')
        .then(($links) => $links.toArray().map((link) => link.getAttribute('href') ?? ''))
        .then((hrefs) => {
            cy.get('body').type('{esc}');
            return cy.wrap(hrefs, { log: false });
        });
};

/**
 * Opens the target's page, picks a role in the access dialog and confirms it.
 *
 * @param userId - whose role
 * @param role - the role to grant
 */
const grantRole = (userId: string, role: string): void => {
    cy.visit(`/en/users/${userId}`);
    cy.intercept('PATCH', '**/users/*').as('grant');
    cy.get('[data-test=user-manage-access]').click();
    cy.pickOption('[data-test=user-access-role]', role);
    cy.get('[data-test=user-access-continue]').click();
    cy.get('[data-test=user-access-confirm]').click();
    // The answer, whichever it is: what follows reads the role the backend now holds.
    cy.wait('@grant');
};

/**
 * Asserts the role the API reports for the target, as a reader that may see it.
 *
 * @param userId - whose role
 * @param role - the role expected
 */
const roleIs = (userId: string, role: string): void => {
    cy.apiAs<UserLike>('admin', 'GET', `/users/${userId}`).should((user) => {
        expect(user?.role).to.equal(role);
    });
};

/**
 * A grant that is refused: the error is shown beside the button, and the role is the same after a
 * reload.
 *
 * @param userId - whose role
 * @param role - the role asked for
 * @param stays - the role the person holds all along
 */
const refusedGrant = (userId: string, role: string, stays: string): void => {
    grantRole(userId, role);
    cy.get('[data-test=user-manage-access-error]').should('exist');
    cy.reload();
    cy.get('[data-test=user-manage-access]').should('exist');
    roleIs(userId, stays);
};

describe('OP19 · Nobody hands out more than they hold', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the moderator and support are refused what they do not hold, and the administrator’s promotion takes effect', () => {
        cy.accountInRole('unverified').then(({ id: targetId }) => {
            cy.step('the moderator may not make anyone an administrator, and the role stays');
            cy.loginAs('moderator');
            refusedGrant(targetId, 'admin', 'customer');

            cy.step('but may make a moderator, which it holds itself');
            grantRole(targetId, 'moderator');
            cy.get('[data-test=user-manage-access-error]').should('not.exist');
            roleIs(targetId, 'moderator');

            cy.step('support holds neither, and is refused both, the role staying as it was');
            cy.apiAs('admin', 'PATCH', `/users/${targetId}`, { role: 'customer' });
            cy.switchUser('support');
            refusedGrant(targetId, 'admin', 'customer');
            refusedGrant(targetId, 'moderator', 'customer');

            cy.step('the administrator promotes the same account to the warehouse');
            cy.switchUser('admin');
            grantRole(targetId, 'warehouse');
            cy.get('[data-test=user-manage-access-error]').should('not.exist');
            roleIs(targetId, 'warehouse');

            cy.step('the promoted person’s next sign-in shows the warehouse menu');
            cy.switchUser('unverified');
            adminMenuLinks().should((links) => {
                expect(links).to.include('/en/inventory');
                expect(links).to.not.include('/en/users');
            });

            cy.step('the grant is on record, written by the administrator');
            eventually(
                () =>
                    cy
                        .apiAs<{ items: AuditRowLike[] }>(
                            'admin',
                            'GET',
                            `/audit?target=${targetId}&pageSize=100`
                        )
                        .then((list) => list?.items ?? []),
                (rows) =>
                    rows.some(
                        (row) => row.action === 'access.role.assigned' && row.actor_role === 'admin'
                    )
            );
        });
    });
});
