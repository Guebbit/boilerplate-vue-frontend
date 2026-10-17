// requires-module: account, observability, users
/**
 * @module
 * AT9 · The platform operator is not the shop. The operator holds one platform role and no shop
 * membership: it runs the installation (health, metrics, the realtime stream) and sees nothing
 * of the shop's customers. Its menu is the platform pages, and every shop page turns it back.
 * The seeded `root` is both an administrator and the operator, so root sees both halves.
 */
import { adminMenuLinks, isTurnedBack } from '../../../support/e2e/steps';

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

        cy.step('the platform pages open');
        cy.visit('/en/admin');
        cy.get('#admin-page').should('exist');
        cy.get('[data-test=admin-tab-overview]').should('exist');

        cy.step('the shop pages turn the operator back, typed in by hand');
        isTurnedBack('/en/users');
        isTurnedBack('/en/audit');
        isTurnedBack('/en/inventory');

        cy.step('root is the shop owner and the operator: both halves');
        cy.switchUser('admin');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/admin');
            expect(links).to.include('/en/users');
            expect(links).to.include('/en/audit');
        });
        cy.visit('/en/admin');
        cy.get('#admin-page').should('exist');
        cy.visit('/en/users');
        cy.get('#users-list-page').should('exist');
    });
});
