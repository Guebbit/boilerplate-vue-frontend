/**
 * @module
 * The staff nav badges count open work, not unread notices: the Sales > Orders entry wears the
 * number `GET /shop-tasks/summary` answers for the signed-in admin, and opening the bell (which
 * marks every notice read) leaves it where it was. The demo profile seeds paid orders, so the
 * count is real work and not an empty agreement.
 */
describe('Staff nav badges', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('the orders badge shows the open orders and survives opening the bell', () => {
        cy.loginAs('admin');

        cy.apiAs<{ salesOrders?: number }>('admin', 'GET', '/shop-tasks/summary').then(
            (summary) => {
                const open = summary?.salesOrders ?? 0;
                expect(open, 'the demo shop has paid orders waiting').to.be.greaterThan(0);

                cy.visit('/en');
                cy.get('[data-test=admin-menu]').click();
                cy.get('[role=menu] a[href="/en/sales/orders"]')
                    .find('.v-badge__badge')
                    .should('contain.text', String(open));
                cy.get('body').type('{esc}');

                // Opening the bell marks every notice read on the server.
                cy.get('[data-test=notifications-bell]').click();
                cy.get('[data-test=notifications-panel]').should('be.visible');
                cy.get('body').type('{esc}');

                cy.get('[data-test=admin-menu]').click();
                cy.get('[role=menu] a[href="/en/sales/orders"]')
                    .find('.v-badge__badge')
                    .should('contain.text', String(open));
            }
        );
    });
});
