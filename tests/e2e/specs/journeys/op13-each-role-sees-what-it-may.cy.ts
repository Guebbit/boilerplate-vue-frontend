// requires-module: account, audit-logs, locales, orders, products, users
/**
 * @module
 * OP13 · Each role sees what it may, and nothing more. A guest, an editor, a moderator and a
 * customer walk the same few doors — the administration menu, the product screens, the order
 * screens, and a direct address they have no business at — and each is let through, or turned
 * back to Home with a notice, exactly as their role says.
 *
 * What each role holds is `shared/authorization-roles.yaml` in the backend; this story proves the
 * UI honours it. The editor is the surprise worth pinning: Orders and Returns sit in the account
 * menu for everyone signed in, and show an editor only their own (none, here).
 */
/**
 * Every address the open administration menu links to.
 *
 * @returns a chain yielding the hrefs; the menu is closed again before it yields
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
 * Follows a direct address the role may not use: the router sends the visitor Home with a notice,
 * and the page they asked for never renders.
 *
 * @param path - the locale-prefixed address
 */
const isTurnedBack = (path: string): void => {
    cy.visit(path);
    cy.get('#home-page').should('exist');
    cy.location('pathname').should('equal', '/en');
    cy.get('.v-alert').should('exist');
};

/**
 * Waits for the orders list to have answered, then says how many rows the role was shown.
 *
 * @returns a chain yielding the row count
 */
const ordersShown = (): Cypress.Chainable<number> => {
    cy.intercept('POST', '**/orders/search').as('ordersSearch');
    cy.visit('/en/orders');
    cy.wait('@ordersSearch');
    return cy.get('body').then(($body) => $body.find('[data-test=list-row]').length);
};

describe('OP13 · Each role sees what it may, and nothing more', { tags: '@smoke' }, () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('guest, editor, moderator and customer each get exactly their own doors', () => {
        cy.step('a guest is sent to sign in by every page that needs an account');
        for (const path of ['/en/cart', '/en/profile', '/en/orders', '/en/wishlist']) {
            cy.visit(path);
            cy.get('#login-page').should('exist');
        }
        cy.subjectId('product.rich').then((productId) => {
            cy.visit(`/en/products/${productId}`);
            cy.get('[data-test=add-to-cart]').should('be.disabled');
            cy.get('[data-test=wishlist-toggle]').should('not.exist');
        });

        cy.step('the editor has products and locales, and no users, audit or stock');
        cy.loginAs('editor');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/locales');
            expect(links).to.not.include('/en/users');
            expect(links).to.not.include('/en/audit');
            expect(links).to.not.include('/en/inventory');
        });
        cy.visit('/en/products');
        cy.get('[data-test=create-product]').should('exist');
        cy.get('[data-test=row-edit]').should('exist');
        cy.subjectId('product.rich').then((productId) => {
            cy.visit(`/en/products/${productId}`);
            cy.get('[data-test=go-to-edit]').should('exist');
        });
        ordersShown().should('equal', 0);
        isTurnedBack('/en/users');
        isTurnedBack('/en/inventory');

        cy.step('the moderator has users, audit and every order, and no product editing');
        cy.switchUser('moderator');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/users');
            expect(links).to.include('/en/audit');
            expect(links).to.not.include('/en/locales');
        });
        cy.visit('/en/users');
        cy.get('#users-list-page').should('exist');
        ordersShown().should('be.greaterThan', 1);
        cy.get('[data-test=row-edit]').should('exist');
        cy.visit('/en/products');
        cy.get('[data-test=product-card]').should('exist');
        cy.get('[data-test=create-product]').should('not.exist');
        cy.subjectId('product.rich').then((productId) => {
            cy.visit(`/en/products/${productId}`);
            cy.get('[data-test=add-to-cart]').should('exist');
            cy.get('[data-test=go-to-edit]').should('not.exist');
        });
        cy.subjectId('order.paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('#order-edit-page').should('exist');
            cy.get('[data-test=button-refund-only]').should('exist');
        });
        isTurnedBack('/en/locales');

        cy.step(
            'the customer has no administration menu and no Edit button, even on their own order'
        );
        cy.switchUser('user');
        cy.get('[data-test=admin-menu]').should('not.exist');
        cy.get('[data-test=user-menu]').should('exist');
        cy.subjectId('product.rich').then((productId) => {
            cy.visit(`/en/products/${productId}`);
            cy.get('[data-test=add-to-cart]').should('not.be.disabled');
            cy.get('[data-test=go-to-edit]').should('not.exist');
        });
        cy.subjectId('order.paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-number]').should('exist');
            cy.get('[data-test=go-to-edit]').should('not.exist');
            isTurnedBack(`/en/orders/${orderId}/edit`);
        });
        isTurnedBack('/en/users');
    });
});
