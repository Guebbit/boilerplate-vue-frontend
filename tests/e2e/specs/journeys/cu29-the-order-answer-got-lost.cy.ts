// requires-module: account, cart, inventory, orders, products
/**
 * @module
 * CU29 · The answer to my order got lost. A customer presses "Place order", the server places it,
 * and the answer never reaches the browser. The browser cannot know the order exists, so it says
 * the order failed and lets the customer press again: pressing again must not place a second order.
 *
 * - **Lost**: the first `POST /cart/checkout` is applied by the server and its answer is replaced by
 *   a 502 on the way back (a gateway that gave up). The page reports the failure; the order exists.
 * - **Again**: the second press is the same request, same `Idempotency-Key` and same body, so the
 *   API answers with the first order instead of placing another, and the customer lands on it.
 *
 * The network is a stub on purpose, as in CU28: `cy.intercept` lets the real request through, so the
 * backend really applies it, and only the answer is swapped. Which side applied what is read back
 * through the API, not from what the page shows. Nothing is paid, so no card budget is spent.
 */
import { addToCartFromStorefront } from '../../../support/e2e/steps';

/** A page of the customer's orders, as the list endpoint answers. */
interface OrdersPage {
    items: unknown[];
    meta: { totalItems: number };
}

/**
 * How many orders the customer has, as the API counts them.
 *
 * @returns a chain yielding the total
 */
const orderCount = (): Cypress.Chainable<number> =>
    cy
        .apiAs<OrdersPage>('user', 'GET', '/orders?pageSize=1')
        .then((page) => page?.meta.totalItems ?? 0);

describe('CU29 · The answer to my order got lost', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('lets the customer press again, and the second press is the first order, placed once', () => {
        cy.step('the customer has a basket ready, and counts their orders');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        // `pickup` needs no address, so choosing it alone enables the button.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');
        const orders = { before: 0 };
        orderCount().then((count) => {
            orders.before = count;
        });

        cy.step('the server places the order, and the answer is replaced by a 502 on the way back');
        const requests: { key: string; body: string }[] = [];
        cy.intercept('POST', '**/cart/checkout', (request) => {
            requests.push({
                key: String(request.headers['idempotency-key'] ?? ''),
                body: JSON.stringify(request.body)
            });
            // `response` fires once the real server has answered: swapping the status HERE is
            // "applied, then lost". https://docs.cypress.io/api/commands/intercept#Intercepted-responses
            if (requests.length === 1) request.on('response', (response) => response.send(502));
        }).as('checkout');
        cy.get('[data-test=cart-checkout]').click();
        cy.wait('@checkout');
        cy.get('[data-test=cart-checkout-error]').should('exist');
        orderCount().should((count) => {
            expect(count, 'the server did place it').to.equal(orders.before + 1);
        });

        cy.step(
            'the customer presses again: the same request goes out and the first order comes back'
        );
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.wait('@checkout');
        cy.get('#order-target').should('exist');

        cy.step('one order, not two, and both requests were the same request');
        orderCount().should((count) => {
            expect(count, 'one order, not two').to.equal(orders.before + 1);
        });
        cy.then(() => {
            expect(requests, 'two requests').to.have.length(2);
            expect(requests[0]?.key, 'a key was sent').not.to.equal('');
            expect(requests[1], 'the same key and the same body').to.deep.equal(requests[0]);
        });
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('not.exist');
        cy.apiAs<{ items: unknown[] }>('user', 'GET', '/cart').should((cart) => {
            expect(cart?.items, 'the cart the order consumed').to.have.length(0);
        });
    });
});
