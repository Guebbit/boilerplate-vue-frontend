// requires-module: account, cart, products
/**
 * @module
 * Guided tours, end to end: the welcome tour opens by itself the first time an account is seen on
 * a browser, can be skipped, stays closed afterwards, reopens from the account menu, and a page
 * tour opens from `?tour=` and loses the parameter.
 *
 * Every other spec runs with tours OFF (`window:before:load` in `support/e2e/commands.ts` injects
 * `TOURS_ENABLED: 'false'`). This one turns them back on per visit through `onBeforeLoad`, which
 * Cypress runs after that hook. The sign-in itself happens with tours off — the form is not what
 * is under test — and the tour is then asked for by loading a page with them on, the same state a
 * returning-from-another-browser account is in.
 */

/** driver.js's popover, the one element every tour step is rendered in. */
const POPOVER = '.driver-popover';

/** driver.js's close (×) button on the popover. */
const POPOVER_CLOSE = '.driver-popover-close-btn';

/**
 * Loads a page with tours switched on.
 *
 * @param path - the route to open
 */
const visitWithTours = (path: string) =>
    cy.visit(path, {
        onBeforeLoad: (contentWindow) => {
            (
                contentWindow as Cypress.AUTWindow & { __APP_CONFIG?: { TOURS_ENABLED?: string } }
            ).__APP_CONFIG!.TOURS_ENABLED = 'true';
        }
    });

describe('Guided tours', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
        cy.loginAs('user');
    });

    it('opens the welcome tour on first sight, and stays closed once skipped', () => {
        visitWithTours('/en');
        cy.get(POPOVER).should('be.visible');

        cy.step('skip it');
        cy.get(POPOVER_CLOSE).click();
        cy.get(POPOVER).should('not.exist');

        cy.step('a later load does not bring it back');
        visitWithTours('/en');
        cy.get('[data-test=user-menu]').should('exist');
        cy.get(POPOVER).should('not.exist');
    });

    it('reopens from the account menu', () => {
        visitWithTours('/en');
        cy.get(POPOVER_CLOSE).click();

        cy.get('[data-test=user-menu]').click();
        cy.get('[role=menu] [data-test=show-tour]').click();
        cy.get(POPOVER).should('be.visible');
        cy.get(POPOVER_CLOSE).click();
        cy.get(POPOVER).should('not.exist');
    });

    it('opens a page tour from ?tour= and removes the parameter', () => {
        cy.step('put something in the cart so the checkout page has anchors');
        cy.navigateTo('/en/products');
        cy.filterByNarrowestCategoryOf('product.rich');
        cy.get('[data-test=product-card-link]').first().click();
        cy.get('[data-test=add-to-cart]').click();

        cy.step('close the welcome tour first, so only the checkout one is in play');
        visitWithTours('/en');
        cy.get(POPOVER_CLOSE).click();
        cy.step('ask for the checkout tour by address');
        visitWithTours('/en/cart?tour=checkout');
        cy.get('[data-test=cart-checkout]').should('exist');
        cy.get(POPOVER).should('be.visible');
        cy.location('search').should('not.include', 'tour=');
    });

    it('ignores a tour id it does not know', () => {
        cy.step('close the welcome tour first, so only the unknown id is in play');
        visitWithTours('/en');
        cy.get(POPOVER_CLOSE).click();
        visitWithTours('/en?tour=nonsense');
        cy.get('[data-test=user-menu]').should('exist');
        cy.get(POPOVER).should('not.exist');
        cy.location('search').should('not.include', 'tour=');
    });
});
