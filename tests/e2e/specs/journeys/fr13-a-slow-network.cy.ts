// requires-module: cart, orders, products, wishlist
/**
 * @module
 * FR13 · A slow network. Every answer the shopper waits for is slow, and they click anyway:
 * add to cart, the heart, the cart's quantity steppers, the invoice. Each control has to say it is
 * busy (disabled, and the corner activity indicator lit), it must not be clickable twice
 * (one request goes out), and a step made and then walked away from still reaches the server.
 *
 * The delay is on the answer, not the request, so the backend has done the work by the time the
 * page is told. "Reload with a step still in the debounce window" is not here: what a reload keeps
 * is a product call (FR4), and nothing flushes on unload today.
 */
import { searchAndOpenProduct } from '../../../support/e2e/steps';

/** How long an answer is held back, long enough to assert the busy state inside it. */
const SLOW_MS = 1500;

/**
 * Holds back every answer the matching requests get.
 *
 * @param method - HTTP method to slow
 * @param pattern - URL glob to slow
 * @param alias - alias to wait on and to count calls through
 */
const slow = (method: string, pattern: string, alias: string): void => {
    cy.intercept(method, pattern, (request) => {
        request.on('response', (response) => {
            response.setDelay(SLOW_MS);
        });
    }).as(alias);
};

/** The corner indicator lit by background work. Read by `display`: its fade is a cosmetic detail. */
const INDICATOR = '[data-test=activity-indicator]';

/** Waits for the corner indicator to go out, so the next wait is proved to be the action's own. */
const expectIdle = (): void => {
    cy.get(INDICATOR).should('have.css', 'display', 'none');
};

/** The corner indicator is lit: something is in flight. */
const expectBusy = (): void => {
    cy.get(INDICATOR).should('have.css', 'display', 'block');
};

/** The quantity the first cart line shows. */
const firstLineQuantity = (): Cypress.Chainable<number> =>
    cy
        .get('[data-test=cart-item]')
        .first()
        .find('[role=status]')
        .invoke('text')
        .then((text) => Number(/(\d+)\s*$/.exec(text.trim())?.[1]));

describe('FR13 · A slow network', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows every wait as a wait, sends nothing twice and keeps a step the shopper walked away from', () => {
        cy.step('add to cart waits: busy, and only one request goes out');
        cy.loginAs('user');
        cy.navigateTo('/en/products');
        searchAndOpenProduct('product.rich');
        expectIdle();
        slow('POST', '**/cart', 'addToCart');
        cy.get('[data-test=add-to-cart]').click();
        cy.get('[data-test=add-to-cart]').should('be.disabled');
        expectBusy();
        cy.wait('@addToCart');
        cy.get('[data-test=add-to-cart]').should('not.be.disabled');
        expectIdle();
        cy.get('@addToCart.all').should('have.length', 1);

        cy.step('the heart waits: busy, then the saved product is let go');
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Saved');
        slow('DELETE', '**/wishlist/*', 'unsave');
        cy.get('[data-test=wishlist-toggle]').click();
        cy.get('[data-test=wishlist-toggle]').should('be.disabled');
        expectBusy();
        cy.wait('@unsave');
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Save to wishlist');
        cy.get('[data-test=wishlist-toggle]').should('not.be.disabled');
        expectIdle();
        cy.get('@unsave.all').should('have.length', 1);

        cy.step('two steps on the cart are one request, even when the page is left at once');
        cy.goToCart();
        cy.intercept('PUT', '**/cart/*').as('setQuantity');
        firstLineQuantity().then((before) => {
            // Both steps and the click on a bar link happen in ONE task, inside the 400 ms debounce:
            // the page is left with the steps still waiting, and they must reach the server all the same.
            cy.get('[data-test=cart-item]')
                .first()
                .find('[data-test=cart-increase]')
                .then(($increase) => {
                    const [increase] = $increase;
                    const products = increase.ownerDocument.querySelector<HTMLElement>(
                        'header nav a[href="/en/products"]'
                    );
                    increase.click();
                    increase.click();
                    products?.click();
                });
            cy.location('pathname').should('equal', '/en/products');
            cy.wait('@setQuantity')
                .its('request.body.quantity')
                .should('equal', before + 2);
            cy.get('@setQuantity.all').should('have.length', 1);

            cy.step('back on the cart the step is there, from the server');
            cy.goToCart();
            cy.get('[data-test=cart-item]')
                .first()
                .should('contain.text', `Quantity: ${String(before + 2)}`);
        });

        cy.step('the invoice waits: both buttons busy, then the PDF is opened once');
        cy.subjectId('order.paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.stubWindowOpen();
            slow('GET', '**/orders/*/invoice', 'invoice');
            cy.get('[data-test=order-view-invoice]').click();
            cy.get('[data-test=order-view-invoice]').should('be.disabled');
            cy.get('[data-test=order-download-invoice]').should('be.disabled');
            cy.wait('@invoice');
            cy.get('@windowOpen').should('have.been.calledOnce');
            cy.get('[data-test=order-view-invoice]').should('not.be.disabled');
            cy.get('@invoice.all').should('have.length', 1);
        });
    });
});
