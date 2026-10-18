// requires-module: account, inventory, users
/**
 * @module
 * OP19 · Only a role manager hands out roles. Handing a staff role out, or taking one away, needs
 * `assign:Role`, which only the administrator holds. The moderator and support may edit a
 * customer but are offered no role to grant, and the server refuses a role asked for by hand; the
 * administrator may promote a customer to the warehouse, and that person's next sign-in shows the
 * warehouse menu.
 *
 * The person acted on is the seeded `unverified` account: a customer. The grant is on record in the
 * audit trail.
 *
 * The second story is the other half of the rule: an account that holds a role is changed only by a
 * role manager, so a moderator is shown no way to demote an administrator.
 */
import { adminMenuLinks, eventually, refusedWith } from '../../../support/e2e/steps';
import { loginDevice, requestAsDevice } from '../../../support/e2e/harness';
import type { E2ERole } from '../../../support/scenario-description';

/** The slice of a user this story reads: a plain customer has no `role` at all. */
interface UserLike {
    role?: string;
    phone?: string;
    active?: boolean;
}

/** One audit row, as far as this story reads it. */
interface AuditRowLike {
    action: string;
    actorRole: string;
    metadata?: { reason?: string };
}

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
 * @param role - the role expected, or `undefined` for a plain customer
 */
const roleIs = (userId: string, role: string | undefined): void => {
    cy.apiAs<UserLike>('admin', 'GET', `/users/${userId}`).should((user) => {
        expect(user?.role).to.equal(role);
    });
};

/**
 * A caller without role management: the picker offers no role to grant, and the server refuses one
 * asked for by hand with a `403` (`ROLE_MANAGEMENT_REQUIRED`, whatever the name), the account staying as it was.
 *
 * @param userId - whose role
 * @param role - the role asked for
 * @param as - the seeded account making the request
 */
const noRoleOffered = (userId: string, role: string, as: E2ERole): void => {
    cy.visit(`/en/users/${userId}`);
    cy.get('[data-test=user-manage-access]').click();
    cy.get('[data-test=user-access-role]').should('have.class', 'v-input--disabled');
    cy.get('[data-test=user-access-cancel]').click();
    loginDevice(as).then((device) => {
        requestAsDevice(device, 'PATCH', `/users/${userId}`, { role })
            .its('status')
            .should('equal', 403);
    });
    roleIs(userId, undefined);
};

describe('OP19 · Nobody hands out more than they hold', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the moderator and support are refused every role, and the administrator’s promotion takes effect', () => {
        cy.accountInRole('unverified').then(({ id: targetId }) => {
            cy.step('the moderator holds no role management: nothing to pick, every role refused');
            cy.loginAs('moderator');
            noRoleOffered(targetId, 'admin', 'moderator');
            noRoleOffered(targetId, 'moderator', 'moderator');

            cy.step('support is refused the same, the account staying a customer');
            cy.switchUser('support');
            noRoleOffered(targetId, 'moderator', 'support');

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
                        (row) => row.action === 'access.role.assigned' && row.actorRole === 'admin'
                    )
            );
        });
    });

    it('a moderator cannot demote an administrator', () => {
        cy.accountInRole('admin').then(({ id: adminId }) => {
            cy.step('a moderator opening an administrator’s page is offered no way to change it');
            cy.loginAs('moderator');
            cy.visit(`/en/users/${adminId}`);
            cy.get('[data-test=user-go-to-edit]').should('not.exist');
            cy.get('[data-test=user-manage-access]').should('not.exist');

            cy.step('and the server refuses the demotion, the role staying as it was');
            loginDevice('moderator').then((device) => {
                requestAsDevice(device, 'PATCH', `/users/${adminId}`, { role: null })
                    .its('status')
                    .should('equal', 403);
            });
            roleIs(adminId, 'admin');
        });
    });
    it('only a role manager changes a staff account, whoever else may edit people', () => {
        cy.accountInRole('warehouse').then(({ id: warehouseId }) => {
            cy.accountInRole('operator').then(({ id: operatorId }) => {
                cy.apiAs<UserLike>('admin', 'GET', `/users/${warehouseId}`).then((before) => {
                    cy.step('support opens the warehouse page: no edit door, no access dialog');
                    cy.loginAs('support');
                    cy.visit(`/en/users/${warehouseId}`);
                    cy.get('[data-test=user-go-to-edit]').should('not.exist');
                    cy.get('[data-test=user-manage-access]').should('not.exist');

                    cy.step(
                        'by hand the server answers the same, for a warehouse and the operator'
                    );
                    loginDevice('support').then((device) => {
                        for (const target of [warehouseId, operatorId])
                            refusedWith(
                                device,
                                'PATCH',
                                `/users/${target}`,
                                { phone: '+39 02 0000 0000' },
                                403,
                                'ROLE_MANAGEMENT_REQUIRED'
                            );
                    });
                    cy.apiAs<UserLike>('admin', 'GET', `/users/${warehouseId}`).should((user) => {
                        expect(user?.phone).to.equal(before?.phone);
                    });

                    cy.step('the moderator may ban a customer but is shown no door for staff');
                    cy.switchUser('moderator');
                    cy.visit(`/en/users/${warehouseId}`);
                    cy.get('[data-test=user-manage-access]').should('not.exist');
                    loginDevice('moderator').then((device) => {
                        refusedWith(
                            device,
                            'PATCH',
                            `/users/${warehouseId}`,
                            { active: false },
                            403,
                            'ROLE_MANAGEMENT_REQUIRED'
                        );
                    });
                    cy.apiAs<UserLike>('admin', 'GET', `/users/${warehouseId}`).should((user) => {
                        expect(user?.active).to.not.equal(false);
                    });

                    cy.step('the moderator creates a customer, and is offered no role to give it');
                    cy.visit('/en/users/create');
                    cy.get('[data-test=user-email] input').type('walk-in@example.test');
                    cy.get('[data-test=user-username] input').type('walk-in');
                    cy.get('[data-test=user-role]').should('not.exist');
                    cy.get('#user-create-page form').submit();
                    cy.location('pathname').should('match', /\/en\/users\/[\da-f]{24}$/);

                    cy.step('the administrator fixes the warehouse phone: allowed');
                    cy.switchUser('admin');
                    cy.apiAs('admin', 'PATCH', `/users/${warehouseId}`, {
                        phone: '+39 02 1111 1111'
                    });
                    cy.apiAs<UserLike>('admin', 'GET', `/users/${warehouseId}`).should((user) => {
                        expect(user?.phone).to.equal('+39 02 1111 1111');
                    });

                    cy.step('both refusals are on record as protected-role attempts');
                    eventually(
                        () =>
                            cy
                                .apiAs<{ items: AuditRowLike[] }>(
                                    'admin',
                                    'GET',
                                    `/audit?target=${warehouseId}&pageSize=100`
                                )
                                .then((list) => list?.items ?? []),
                        (rows) =>
                            ['support', 'moderator'].every((role) =>
                                rows.some(
                                    (row) =>
                                        row.action === 'security.forbidden' &&
                                        row.actorRole === role &&
                                        row.metadata?.reason === 'role_protected'
                                )
                            )
                    );
                });
            });
        });
    });
});
