// requires-module: account, observability, users
/**
 * @module
 * AT9 · The platform operator is not the shop. The operator holds one platform role and no shop
 * membership: it runs the installation (health, metrics, the realtime stream) and sees nothing
 * of the shop's customers. Its menu is the platform pages, every shop page turns it back, and
 * the Admin page hides the one button that needs a shop key — clearing expired tokens, which the
 * backend would refuse (`tokens.any.delete`). The seeded `root` is both an administrator and the
 * operator, so root sees both halves.
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
 * Follows an address the role may not use: the router sends the visitor Home with a notice, and
 * the page never renders.
 *
 * @param path - the locale-prefixed address
 */
const isTurnedBack = (path: string): void => {
    cy.visit(path);
    cy.get('#home-page').should('exist');
    cy.location('pathname').should('equal', '/en');
    cy.get('.v-alert').should('exist');
};

describe('AT9 · The platform operator is not the shop', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the operator gets the platform pages and none of the shop, and root gets both', () => {
        cy.step('the operator signs in: the menu is the platform pages only');
        cy.loginAs('operator');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/admin');
            expect(links).to.include('/en/playground/realtime');
            for (const shopPage of ['/users', '/audit', '/inventory', '/products', '/locales']) {
                expect(links, shopPage).to.not.include(`/en${shopPage}`);
            }
        });

        cy.step('the platform pages open, and the clean-up button the operator cannot use is gone');
        cy.visit('/en/admin');
        cy.get('#admin-page').should('exist');
        cy.get('[data-test=admin-tab-overview]').should('exist');
        cy.get('[data-test=admin-clear-expired-tokens]').should('not.exist');

        cy.step('the shop pages turn the operator back, typed in by hand');
        isTurnedBack('/en/users');
        isTurnedBack('/en/audit');
        isTurnedBack('/en/inventory');

        cy.step('root is the shop owner and the operator: both halves, clean-up included');
        cy.switchUser('admin');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/admin');
            expect(links).to.include('/en/users');
            expect(links).to.include('/en/audit');
        });
        cy.visit('/en/admin');
        cy.get('[data-test=admin-clear-expired-tokens]').should('exist');
        cy.visit('/en/users');
        cy.get('#users-list-page').should('exist');
    });
});
