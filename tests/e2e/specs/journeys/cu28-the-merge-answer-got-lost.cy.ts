// requires-module: account, cart, products
/**
 * @module
 * CU28 · The answer to my cart merge got lost. A guest signs in, the server merges the guest cart,
 * and the answer never reaches the browser. The browser cannot know the merge happened, so it keeps
 * the guest cart and tries again later: that retry must not add the same quantities a second time.
 *
 * - **Lost**: the first `POST /cart/merge` is applied by the server and its answer is replaced by a
 *   502 on the way back (a gateway that gave up): no conclusive answer, so the shopper is told the
 *   cart is kept and the browser copy stays.
 * - **Retried**: the next time the same session appears (a reload) the same merge is sent under the
 *   same `Idempotency-Key`, and the account's cart holds the guest's quantity once, not twice.
 * - **Ended**: signing out clears the device copy and the pending merge, so the next sign-in
 *   sends nothing and the cart still holds the quantity once.
 *
 * The network is a stub on purpose: `cy.intercept` lets the real request through, so the backend
 * really applies it, and only the answer is swapped for a 502. (`forceNetworkError` cannot do this:
 * from a response handler the browser request never failed, in a live run, and no error reached the
 * app.) Which side applied what is read back through the API, not from what the page shows.
 */
import {
    GUEST_CART_KEY,
    GUEST_MERGE_ATTEMPT_KEY,
    searchAndOpenProduct,
    submitLoginForm
} from '../../../support/e2e/steps';

/** How many units the guest puts in the cart: more than one, so a doubling cannot pass for a 2. */
const GUEST_UNITS = 2;

/**
 * Signs in through the login form the guest was sent to.
 */
const signInThroughTheForm = (): void => {
    cy.accountOf('user').then(({ email, password }) => {
        submitLoginForm(email, password);
    });
};

/**
 * Lets the first merge reach the server and replaces its answer with a 502; every later merge
 * passes untouched.
 * The `merge` alias counts both, so the retry can be waited on.
 */
const loseTheFirstMergeAnswer = (): void => {
    let calls = 0;
    cy.intercept('POST', '**/cart/merge', (request) => {
        calls += 1;
        // `response` fires once the real server has answered: swapping the status HERE is
        // "applied, then lost". `send(502)` keeps the real body and headers, which a 5xx ignores.
        // https://docs.cypress.io/api/commands/intercept#Intercepted-responses
        if (calls === 1) request.on('response', (response) => response.send(502));
    }).as('merge');
};

/**
 * As a guest, adds a seeded product from its page to the cart `GUEST_UNITS` times.
 *
 * @param name - a `product.*` guarantee name
 */
const guestAdds = (name: string): void => {
    cy.visit('/en/products');
    searchAndOpenProduct(name);
    for (let unit = 0; unit < GUEST_UNITS; unit += 1) cy.get('[data-test=add-to-cart]').click();
    cy.get('[data-test=nav-badge]').should('contain.text', String(GUEST_UNITS));
};

/**
 * Reads back the account's cart from the server and checks the product's quantity there.
 *
 * @param productId - the product the guest added
 * @param quantity - what the cart must hold of it
 */
const accountHolds = (productId: string, quantity: number): void => {
    cy.apiAs<{ items: { productId: string; quantity: number }[] }>('user', 'GET', '/cart').then(
        (cart) => {
            const lines = (cart?.items ?? []).filter((line) => line.productId === productId);
            expect(lines, 'one line for the product').to.have.length(1);
            expect(lines[0]?.quantity, 'the guest quantity, added once').to.equal(quantity);
        }
    );
};

describe('CU28 · The answer to my cart merge got lost', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.apiAs('user', 'DELETE', '/cart/all');
    });

    it('keeps the guest cart, and the retry after a reload adds it once', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.step('a guest fills a cart, and the merge answer will be lost on the way back');
            guestAdds('product.inStock');
            loseTheFirstMergeAnswer();

            cy.step(
                'signing in: the server merges, the browser hears nothing and says it keeps it'
            );
            cy.get('[data-test=nav-login-link]').click();
            signInThroughTheForm();
            cy.contains('stays on this device').should('exist');
            cy.wait('@merge');
            cy.window().then((win) => {
                expect(win.localStorage.getItem(GUEST_CART_KEY), 'the guest copy').not.to.equal(
                    null
                );
                expect(
                    win.localStorage.getItem(GUEST_MERGE_ATTEMPT_KEY),
                    'the pending merge'
                ).not.to.equal(null);
            });
            accountHolds(productId, GUEST_UNITS);

            cy.step('the page is reloaded: the session returns and the same merge is sent again');
            cy.reload();
            cy.wait('@merge');

            cy.step('nothing was added twice, and the browser copy is gone at last');
            accountHolds(productId, GUEST_UNITS);
            cy.window().should((win) => {
                expect(win.localStorage.getItem(GUEST_CART_KEY), 'the guest copy').to.equal(null);
                expect(
                    win.localStorage.getItem(GUEST_MERGE_ATTEMPT_KEY),
                    'the pending merge'
                ).to.equal(null);
            });
            cy.goToCart();
            cy.get('[data-test=cart-item]').should('have.length', 1);
            cy.get('[data-test=cart-item]').should('contain.text', `Quantity: ${GUEST_UNITS}`);
        });
    });

    it('ends the lost merge with the session: the next sign-in sends nothing and adds nothing', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.step('a guest fills a cart, the merge answer is lost, the shopper signs out again');
            guestAdds('product.inStock');
            loseTheFirstMergeAnswer();
            cy.get('[data-test=nav-login-link]').click();
            signInThroughTheForm();
            cy.contains('stays on this device').should('exist');
            cy.wait('@merge');
            cy.logout();

            cy.step('the sign-out cleared the device copy, so a shared browser hands nothing on');
            cy.window().should((win) => {
                expect(win.localStorage.getItem(GUEST_CART_KEY), 'the guest copy').to.equal(null);
                expect(
                    win.localStorage.getItem(GUEST_MERGE_ATTEMPT_KEY),
                    'the pending merge'
                ).to.equal(null);
            });

            cy.step('the next sign-in sends no merge, and the cart still holds the quantity once');
            cy.get('[data-test=nav-login-link]').click();
            signInThroughTheForm();
            cy.goToCart();
            cy.get('[data-test=cart-item]').should('have.length', 1);
            cy.get('@merge.all').should('have.length', 1);
            accountHolds(productId, GUEST_UNITS);
        });
    });
});
