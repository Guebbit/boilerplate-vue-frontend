// requires-module: account, cart
/**
 * @module
 * FR15 · A deploy lands mid-session. A customer has the shop open when a new version goes out:
 * the old build's page chunks are gone from the server, so the next page they open cannot load.
 * The tab recovers on its own, once: it reloads the address the customer was heading to, and the
 * fresh build serves the page. If the chunk is STILL gone after that one reload, the build is
 * broken rather than stale, and the tab shows the error page instead of reloading for ever.
 *
 * The chunk is the cart route's (`assets/CartEntry-<hash>.js`), made to answer 404 by an intercept.
 * That route is open to guests too, but this journey is the signed-in customer's. The retries are
 * counted as DOCUMENT requests for the cart's address, not chunk requests: a browser also preloads
 * a chunk, so one failed attempt is several requests for the same file.
 *
 * Needs a production build: Vite's preload error does not fire under `vite dev`, which serves
 * modules unbundled. Every e2e run serves `build:e2e`'s output, so the demo and live profiles both do.
 */

/** The cart route's lazy chunk: Vite names it after its entry view, with a content hash. */
const CART_CHUNK = '**/assets/CartEntry-*.js';

/** The address the customer is heading to. */
const CART_PAGE = '**/en/cart';

describe('FR15 · A deploy lands mid-session', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('user');
        cy.visit('/en');
        cy.get('#home-page').should('exist');
    });

    it('reloads once to the same page when the chunk is gone, and shows the error page when it stays gone', () => {
        // Whether the chunk is gone right now; read by the intercept on every request for it.
        let chunkIsGone = true;
        // Whether the fresh build is what the reload fetches (a real deploy has finished by then).
        let reloadFindsTheNewBuild = true;
        let reloads = 0;

        cy.intercept({ method: 'GET', url: CART_CHUNK }, (request) => {
            if (chunkIsGone) request.reply({ statusCode: 404, body: 'gone' });
            else request.continue();
        });
        // The app is a single page: once it is running, the cart's own address is only ever asked for by a reload.
        cy.intercept({ method: 'GET', url: CART_PAGE }, (request) => {
            reloads += 1;
            if (reloadFindsTheNewBuild) chunkIsGone = false;
            request.continue();
        });

        cy.step('the chunk is gone: opening the cart reloads once, to the cart, and it loads');
        cy.goToCart();
        cy.get('#cart-page').should('exist');
        cy.location('pathname').should('equal', '/en/cart');
        cy.get('#error-page').should('not.exist');
        cy.then(() => {
            expect(reloads, 'document requests for the cart').to.equal(1);
        });

        cy.step('a new tab session; the chunk stays gone through the reload');
        cy.then(() => {
            chunkIsGone = true;
            reloadFindsTheNewBuild = false;
            reloads = 0;
        });
        cy.clearAllSessionStorage();
        cy.visit('/en');
        cy.get('#home-page').should('exist');

        cy.step('opening the cart reloads once, fails again and shows the error page');
        cy.goToCart();
        cy.get('#error-page').should('be.visible');
        cy.get('#cart-page').should('not.exist');
        cy.then(() => {
            expect(reloads, 'document requests for the cart: one reload, not a loop').to.equal(1);
        });
    });
});
