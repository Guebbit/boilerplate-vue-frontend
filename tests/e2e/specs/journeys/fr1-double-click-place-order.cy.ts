// requires-module: account, cart, inventory, orders, products
/**
 * @module
 * FR1 · Double-click "Place order". A customer presses the checkout button twice, fast, on a slow
 * connection. There is one order, not two: the button is disabled while the first request is in
 * flight, and whatever does get sent twice carries the same `Idempotency-Key`, which the API
 * answers with the first result instead of placing the order again.
 *
 * The answer is held back 1.5 s so the in-flight state is something the browser can be asked about.
 * Nothing is paid, so no card budget is spent.
 */
import { addToCartFromStorefront } from '../../../support/e2e/steps';

/** How long the checkout answer is held back, so "in flight" lasts long enough to observe. */
const CHECKOUT_DELAY_MS = 1500;

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

describe('FR1 · Double-click "Place order"', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('places one order, disables the button while waiting, and sends one idempotency key', () => {
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

        cy.step('the answer is slow, and the customer presses checkout twice');
        const keys: string[] = [];
        cy.intercept('POST', '**/cart/checkout', (request) => {
            keys.push(String(request.headers['idempotency-key'] ?? ''));
            request.on('response', (response) => {
                response.setDelay(CHECKOUT_DELAY_MS);
            });
        });
        cy.get('[data-test=cart-checkout]').dblclick();

        cy.step('while it is in flight the button cannot be pressed again');
        cy.get('[data-test=cart-checkout]').should('be.disabled');

        cy.step('one order lands, and every request carried the same idempotency key');
        cy.get('#order-target').should('exist');
        cy.then(() => {
            expect(keys.length, 'the page sent at least one request').to.be.greaterThan(0);
            expect(
                keys.every((key) => key !== ''),
                'each carried a key'
            ).to.equal(true);
            expect(new Set(keys).size, 'and it was the same key').to.equal(1);
        });
        orderCount().should((count) => {
            expect(count, 'one order, not two').to.equal(orders.before + 1);
        });
        cy.get('[data-test=cart-item]').should('not.exist');
    });
});
