// requires-module: account, cart, delivery, orders, products
/**
 * @module
 * FR4 · Reload in the middle of checkout. A customer has chosen how the parcel travels and where it
 * goes, then the tab reloads (a refresh, a crashed tab, a phone waking up). What the server already
 * knows must still be on the screen, and nothing has to be chosen twice: the delivery method is saved
 * the moment it is picked, the address book pre-selects the default, and the cart's lines are the
 * server's. Checkout then places exactly one order, with the method and the address the customer saw.
 *
 * NOT here: what a reload loses today — the order note, the payment choice, and a quantity click
 * still inside its 400 ms debounce. What the shop should do about each is an open product call;
 * when it is answered, its assertions join this story.
 */

/** The slice of an order this story reads: the frozen method and address. */
interface OrderLike {
    id: string;
    shippingMethod?: { id?: string } | string;
    shippingAddress?: { city?: string };
}

/** The slice of an order search this story reads: how many orders the customer has. */
interface OrdersPage {
    items: OrderLike[];
    meta?: { totalItems?: number };
}

/**
 * How many orders the customer has right now.
 */
const orderCount = (): Cypress.Chainable<number> =>
    cy
        .apiAs<OrdersPage>('user', 'POST', '/orders/search', { page: 1, pageSize: 1 })
        .then((page) => page?.meta?.totalItems ?? page?.items.length ?? 0);

describe('FR4 · Reload in the middle of checkout', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        // The customer's own cart may hold lines already; start from empty so the one line is ours.
        cy.apiAs('user', 'DELETE', '/cart/all');
        cy.visit('/en');
    });

    it('keeps the delivery method, the address and the lines across a reload, and places one order', () => {
        const before = { orders: 0 };
        orderCount().then((count) => {
            before.orders = count;
        });

        cy.step('the customer fills the cart and picks standard delivery to their address');
        cy.loginAs('user');
        cy.subjectId('product.inStock').then((productId) => {
            cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
        });
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.intercept('PUT', '**/cart/shipping-method').as('saveMethod');
        cy.get('[data-test=shipping-method-standard]').click();
        cy.wait('@saveMethod').its('response.statusCode').should('be.within', 200, 299);
        cy.get('[data-test=address-picker] input[type=radio]:checked').should('have.length', 1);
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');

        cy.step('the tab reloads: the method, the address and the line are all still there');
        cy.reload();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.get('[data-test=shipping-method-standard] input').should('be.checked');
        cy.get('[data-test=address-picker] input[type=radio]:checked').should('have.length', 1);

        cy.step('checking out needs no further choice, and places exactly one order');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.location('pathname').then((path) => {
            const orderId = String(path.split('/').at(-1));
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                const method = order?.shippingMethod;
                expect(typeof method === 'string' ? method : method?.id).to.equal('standard');
                expect(order?.shippingAddress?.city, 'the address the customer saw').to.be.a(
                    'string'
                );
            });
        });
        orderCount().should((count) => {
            expect(count).to.equal(before.orders + 1);
        });
        cy.get('[data-test=cart-item]').should('not.exist');
    });
});
