// requires-module: account, api-keys, feedback, inventory, orders, products, returns
/**
 * @module
 * OP16 · The shop manager's morning. The manager runs what is for sale and what happens to an
 * order after it arrives, and is not the administrator: no API keys, no Admin page, no realtime
 * stream. They start work on a paid order (the warehouse ships it; the manager has no ship
 * button), cancel a second order without refunding it, answer a return, and reprice a product
 * that a guest then sees at once. Stock and the inbox are theirs to read, not to write, and the
 * screens show no control the backend would refuse.
 *
 * Money is not the manager's: refund buttons stay shut and there is no offline-payment form.
 */

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
 * Follows an address the role may not use: Home, with a notice.
 *
 * @param path - the locale-prefixed address
 */
const isTurnedBack = (path: string): void => {
    cy.visit(path);
    cy.get('#home-page').should('exist');
    cy.location('pathname').should('equal', '/en');
    cy.get('.v-alert').should('exist');
};

/** The new price the manager sets, as the price field is typed. */
const NEW_PRICE = '31.40';

describe('OP16 · The shop manager’s morning', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the manager runs the orders, the returns and the prices, and is shown nothing it may not do', () => {
        cy.step('the manager’s menu has the shop to run and none of the platform or the keys');
        cy.loginAs('manager');
        adminMenuLinks().should((links) => {
            for (const page of [
                '/locales',
                '/inventory',
                '/feedback',
                '/webhooks/subscriptions',
                '/webhooks/deliveries',
                '/audit'
            ]) {
                expect(links, page).to.include(`/en${page}`);
            }
            for (const page of ['/api-keys', '/admin', '/playground/realtime']) {
                expect(links, page).to.not.include(`/en${page}`);
            }
        });
        isTurnedBack('/en/api-keys');
        isTurnedBack('/en/admin');

        cy.step('a paid order: the manager starts work on it, and has no ship button');
        cy.subjectId('order.paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=mark-started]').should('not.exist');
            cy.get('[data-test=mark-shipped]').should('not.exist');
            cy.apiAs<{ status: string }>('manager', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'processing');

            cy.step('on the edit page the money is shut: no refund, no offline payment');
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-refund-only]').should('be.disabled');
            cy.get('[data-test=button-cancel-and-refund]').should('be.disabled');
            cy.get('[data-test=record-offline-payment-form]').should('not.exist');
        });

        cy.step('a second order is cancelled only: the manager may cancel, the money stays');
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-cancel-only]').should('not.be.disabled').click();
            cy.get('[data-test=button-cancel-only]').should('be.disabled');
            cy.apiAs<{ status: string }>('manager', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'cancelled');
        });

        cy.step('a return request: the manager approves it');
        cy.subjectId('return.requested').then((returnId) => {
            cy.visit(`/en/returns/${returnId}`);
            cy.get('[data-test=return-approve]').click();
            cy.get('[data-test=return-approve]').should('not.exist');
            cy.apiAs<{ status: string }>('manager', 'GET', `/returns/${returnId}`)
                .its('status')
                .should('equal', 'approved');
        });

        cy.step('stock is read, not written: the board shows, the forms and the sweep do not');
        cy.visit('/en/inventory');
        cy.get('[data-test=level-row], [data-test=movement-row]').should('exist');
        cy.get('[data-test=receipt-form]').should('not.exist');
        cy.get('[data-test=adjust-form]').should('not.exist');
        cy.get('[data-test=sweep-submit]').should('not.exist');

        cy.step('a ticket in the inbox is readable, with no way to answer, annotate or erase it');
        cy.apiAs('admin', 'POST', '/feedback/contact', {
            email: 'asker@example.com',
            subject: 'OP16 kennel question',
            message: 'Does the kennel come flat-packed?'
        });
        cy.visit('/en/feedback');
        cy.get('[data-test=feedback-item]').should('contain.text', 'OP16 kennel question');
        cy.get('[data-test=feedback-notes-save]').should('not.exist');
        cy.get('[data-test=feedback-delete]').should('not.exist');
        cy.get('[data-test=feedback-status] input').should('be.disabled');

        cy.step('the manager reprices a product, and a guest sees the new price at once');
        cy.subjectId('product.rich').then((productId) => {
            cy.visit(`/en/products/${productId}/edit`);
            // The form fills in from the fetched record; saving before then sends an empty price.
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(NEW_PRICE);
            cy.get('form').first().submit();
            cy.contains('Product updated successfully').should('exist');

            cy.logout();
            cy.visit(`/en/products/${productId}`);
            cy.get('body').should('contain.text', NEW_PRICE);
        });
    });
});
