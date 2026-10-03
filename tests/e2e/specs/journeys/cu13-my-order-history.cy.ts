// requires-module: delivery, orders, payments
/**
 * @module
 * CU13 · My order history. The customer opens their orders from the account menu, reads the list,
 * narrows it by status, and opens a delivered order to read the whole page: the number, the
 * statuses, what was paid with, how it was shipped, the parcel, and the invoice in a new tab.
 *
 * The story is about the list being the customer's own and naming each order the way the mail and
 * the invoice do — by number, never the database id. Every claim is read against the API for the
 * same account. Nothing here pays, so card budgets are untouched.
 */

/** The page size the list offers that shows the most rows. */
const LARGEST_PAGE = '50';

/** One order as the API lists it, as far as this journey reads. */
interface ListedOrder {
    id: string;
    orderNumber?: string;
    status: string;
}

/** The ids behind the list's rows, read off each row's own View link. */
const rowIds = (): Cypress.Chainable<string[]> =>
    cy
        .get('[data-test=list-row] [data-test=row-view]')
        .then(($links) =>
            $links
                .toArray()
                .map((link) => String(link.getAttribute('href')).split('/').at(-1) ?? '')
        );

describe('CU13 · My order history', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the list is mine and numbered, the filter matches the rows, and a delivered order reads out whole', () => {
        cy.step('opens the orders from the account menu');
        cy.loginAs('user');
        cy.navigateViaMenu('account', '/en/orders');
        cy.get('[data-test=list-row]').should('have.length.at.least', 1);
        cy.pickOption('[data-test=page-size]', LARGEST_PAGE);
        cy.get('form button[type=submit]').click();

        cy.step('only my orders are listed, each by its number, and the deleted one is hidden');
        cy.apiAs<{ items: ListedOrder[] }>('user', 'GET', `/orders?pageSize=${LARGEST_PAGE}`).then(
            (listed) => {
                const mine = listed?.items ?? [];
                expect(mine.length, 'the customer has a history').to.be.greaterThan(2);
                cy.get('[data-test=list-row]').should('have.length', mine.length);
                rowIds().should(
                    'deep.equal',
                    mine.map((order) => order.id)
                );

                cy.get('[data-test=row-order-number]').each(($cell, index) => {
                    expect($cell.text().trim(), 'the number, not the id').to.equal(
                        mine[index]?.orderNumber
                    );
                });

                for (const foreign of ['order.softDeleted', 'order.otherPending']) {
                    cy.subjectId(foreign).then((orderId) => {
                        expect(
                            mine.map((order) => order.id),
                            `${foreign} is not in this customer's list`
                        ).to.not.include(orderId);
                    });
                }
            }
        );

        cy.step('the status filter keeps exactly the rows of that status');
        cy.pickOption('[data-test=filter-status]', 'Delivered');
        cy.get('form button[type=submit]').click();
        cy.apiAs<{ items: ListedOrder[] }>(
            'user',
            'GET',
            `/orders?status=delivered&pageSize=${LARGEST_PAGE}`
        ).then((delivered) => {
            const expected = (delivered?.items ?? []).map((order) => order.id);
            expect(expected.length, 'the customer has delivered orders').to.be.greaterThan(0);
            rowIds().should('deep.equal', expected);
            cy.get('[data-test=list-row]').each(($row) => {
                expect($row.text()).to.contain('Delivered');
            });
        });

        cy.step('opens the delivered order and reads the whole page');
        cy.subjectId('order.delivered').then((orderId) => {
            cy.get(`[data-test=row-view][href$="/orders/${orderId}"]`).click();
            cy.apiAs<{ orderNumber: string }>('user', 'GET', `/orders/${orderId}`).then((order) => {
                cy.get('[data-test=order-number]').should('contain.text', order?.orderNumber ?? '');
            });
        });
        cy.get('[data-test=order-payment-status]').should('contain.text', 'Paid');
        cy.get('[data-test=order-fulfillment-status]').should('contain.text', 'Delivered');
        cy.get('[data-test=order-payment-method]').should('exist');
        // The seeded delivered order is a pickup: a method and a cost, and no address to show.
        // The address read-out is CU15's, on an order that chose one.
        cy.get('[data-test=order-shipping]').should('exist');
        cy.get('[data-test=order-shipping-address]').should('not.exist');
        cy.get('[data-test=shipment-status]').should('contain.text', 'Delivered');

        cy.step('the invoice opens in a new tab');
        cy.stubWindowOpen();
        cy.get('[data-test=order-view-invoice]').click();
        cy.get('@windowOpen').should('have.been.calledOnce');
        cy.get('@windowOpen').should('have.been.calledWithMatch', /^blob:/, '_blank');
    });
});
