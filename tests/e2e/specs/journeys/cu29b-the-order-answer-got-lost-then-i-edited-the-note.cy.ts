// requires-module: account, cart, inventory, orders, products
/**
 * @module
 * CU29b · The answer to my order got lost, and then I changed my mind about the note. The first
 * `POST /cart/checkout` is applied and its answer replaced by a 502. The customer edits the order
 * note and presses "Place order" again.
 *
 * The edited order is another request, so it travels under another `Idempotency-Key` (a key is
 * never reused for a different body, which the API answers with 422). The server then finds no
 * basket left, and the page reads the cart again: the customer ends on the order that exists or on
 * a cart that shows it is empty, never on a button that can never work.
 */
import { addToCartFromStorefront } from '../../../support/e2e/steps';

/** The slice of an order this story reads. */
interface OrderLike {
    id: string;
    status: string;
}

/**
 * Cancels every unpaid order the seeded customer holds. The first, lost, checkout leaves an order
 * open, and the shop caps how many one account may have; the seeded one would make the second
 * request answer the cap instead of finding the basket gone, which is a different story (CU20).
 */
const clearOpenOrders = (): void => {
    cy.apiAs<{ items: OrderLike[] }>('user', 'GET', '/orders?pageSize=100').then((page) => {
        for (const { id, status } of page?.items ?? [])
            if (status === 'pending') cy.apiAs('user', 'POST', `/orders/${id}/cancel`, {});
    });
};

describe('CU29b · Lost answer, then a different note', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('does not leave the customer pressing a button that can never work', () => {
        cy.loginAs('user');
        clearOpenOrders();
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        // `pickup` needs no address, so choosing it alone enables the button.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');

        const keys: string[] = [];
        cy.intercept('POST', '**/cart/checkout', (request) => {
            keys.push(String(request.headers['idempotency-key'] ?? ''));
            // `response` fires once the real server has answered: swapping the status HERE is
            // "applied, then lost". https://docs.cypress.io/api/commands/intercept#Intercepted-responses
            if (keys.length === 1) request.on('response', (response) => response.send(502));
        }).as('checkout');
        cy.get('[data-test=cart-checkout]').click();
        cy.wait('@checkout');
        cy.get('[data-test=cart-checkout-error]').should('exist');

        cy.step('the customer edits the note and presses again: another request, another key');
        cy.textareaIn('cart-notes').type('leave it at the door');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.wait('@checkout').its('response.statusCode').should('not.equal', 422);
        cy.then(() => {
            expect(keys, 'two requests').to.have.length(2);
            expect(keys[1], 'a different body gets its own key').not.to.equal(keys[0]);
        });

        cy.step('the page does not offer an order for a basket the server no longer holds');
        cy.get('body').should(($body) => {
            const onTheOrder = $body.find('#order-target').length > 0;
            const cartIsEmpty = $body.find('[data-test=cart-item]').length === 0;
            expect(onTheOrder || cartIsEmpty, 'the customer can see the order').to.equal(true);
        });
    });
});
