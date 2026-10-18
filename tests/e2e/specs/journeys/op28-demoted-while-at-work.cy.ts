// requires-module: account, inventory, users
/**
 * @module
 * OP28 · Demoted while at work. A warehouse worker has the stock room open when the administrator
 * takes the role away. The server stops them at once (it reads roles on every request); the page
 * follows without a reload, the first time the server says no: the menu loses the staff entries
 * and the stock room turns the worker back. Widening is not pushed, so a re-granted role shows on
 * the next load. A ban ends the session outright, and a fresh sign-in is refused until it is
 * lifted.
 */
import { adminMenuLinks } from '../../../support/e2e/steps';

/** The slice of a stock movement list this story counts. */
interface MovementsLike {
    items?: unknown[];
}

describe('OP28 · Demoted while at work', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the page follows a demotion on its next refused call, and a ban ends the session', () => {
        cy.accountOf('warehouse')
            .then(({ email, password }) =>
                cy.accountInRole('warehouse').then(({ id: warehouseId }) => ({
                    warehouseId,
                    email,
                    password
                }))
            )
            .then(({ warehouseId, email, password }) => {
                cy.subjectProduct('product.rich').then(({ id: productId, title }) => {
                    cy.step(
                        'the warehouse is in the stock room, with the receipt form and the menu'
                    );
                    cy.loginAs('warehouse');
                    cy.visit('/en/inventory');
                    cy.get('[data-test=receipt-form]').should('exist');
                    adminMenuLinks().should('include', '/en/inventory');

                    cy.step('the administrator takes the role away');
                    cy.apiAs('admin', 'PATCH', `/users/${warehouseId}`, { role: null });

                    cy.step('a receipt is refused by the server, and the ledger is unchanged');
                    cy.apiAs<MovementsLike>(
                        'admin',
                        'GET',
                        `/inventory/movements?productId=${productId}`
                    ).then((before) => {
                        cy.get('[data-test=receipt-product] input').clear();
                        cy.get('[data-test=receipt-product] input').type(title);
                        cy.get('[role=listbox] [role=option]').contains(title).click();
                        cy.get('[data-test=receipt-quantity] input').clear();
                        cy.get('[data-test=receipt-quantity] input').type('4');
                        cy.get('[data-test=receipt-submit]').click();
                        cy.apiAs<MovementsLike>(
                            'admin',
                            'GET',
                            `/inventory/movements?productId=${productId}`
                        ).should((after) => {
                            expect(after?.items?.length).to.equal(before?.items?.length);
                        });
                    });

                    cy.step(
                        'without a reload the page lets go of the staff menu and the stock room'
                    );
                    cy.get('[data-test=admin-menu]').should('not.exist');
                    cy.location('pathname').should('equal', '/en');

                    cy.step('still signed in as a customer: a basket, and their own orders');
                    cy.get('[data-test=pinned-Cart]').should('exist');
                    cy.visit('/en/orders');
                    cy.get('#orders-list-page').should('exist');

                    cy.step('a re-granted role shows on the next load, not before');
                    cy.apiAs('admin', 'PATCH', `/users/${warehouseId}`, { role: 'warehouse' });
                    cy.reload();
                    adminMenuLinks().should('include', '/en/inventory');

                    cy.step('a ban ends the session, and a fresh sign-in is refused');
                    cy.apiAs('admin', 'PATCH', `/users/${warehouseId}`, { active: false });
                    cy.visit('/en/inventory');
                    cy.get('#login-page').should('exist');
                    cy.env(['apiUrl']).then(({ apiUrl }) => {
                        cy.request({
                            method: 'POST',
                            url: `${String(apiUrl)}/account/login`,
                            body: { email, password },
                            failOnStatusCode: false
                        })
                            .its('status')
                            .should('be.within', 400, 403);
                    });

                    cy.step('lifting the ban lets them in again');
                    cy.apiAs('admin', 'PATCH', `/users/${warehouseId}`, { active: true });
                    cy.loginAs('warehouse');
                    adminMenuLinks().should('include', '/en/inventory');
                });
            });
    });
});
