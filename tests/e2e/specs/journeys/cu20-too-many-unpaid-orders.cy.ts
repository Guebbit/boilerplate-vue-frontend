// requires-module: account, cart, inventory, orders, payments, products
/**
 * @module
 * CU20 · Too many unpaid orders. An unpaid order holds its stock (a week for a bank transfer), so
 * the shop caps how many one account may have open at once, whatever the payment method (two by
 * default). The seeded customer already has one. A second order goes through; a third is refused
 * with a sentence about unpaid orders and a link to each, not a generic error, and the cart survives, by transfer and
 * by card alike. Cancelling one of the open orders frees a slot, and the same basket then goes
 * through by card and is paid.
 *
 * One card confirm is spent, as `user`.
 */
import { addToCartFromStorefront, idFromLocation } from '../../../support/e2e/steps';

/** The slice of an order this story reads: where it stands. */
interface OrderLike {
    status: string;
}

/** A page of orders, as the list endpoint answers. */
interface OrdersPage {
    items: OrderLike[];
}

/**
 * How many unpaid orders the customer has open: placed and neither paid nor cancelled.
 *
 * @returns a chain yielding the count
 */
const openOrders = (): Cypress.Chainable<number> =>
    cy
        .apiAs<OrdersPage>('user', 'GET', '/orders?pageSize=100')
        .then((page) => (page?.items ?? []).filter(({ status }) => status === 'pending').length);

/**
 * Puts the ordinary product in the cart from a fresh list: the category chip the last round
 * clicked would otherwise toggle off.
 */
const putInCart = (): void => {
    cy.visit('/en/products');
    addToCartFromStorefront('product.rich');
};

/**
 * Puts the ordinary product in the cart and presses checkout with the given payment method.
 * `pickup` needs no address, so choosing it alone enables the button.
 *
 * @param method - the payment method's radio id: `card` or `bank_transfer`
 */
const checkoutWith = (method: 'card' | 'bank_transfer'): void => {
    putInCart();
    cy.goToCart();
    cy.get('[data-test=shipping-method-pickup]').click();
    cy.get(`[data-test=payment-method-${method}] label`).click();
    cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
};

describe('CU20 · Too many unpaid orders', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refuses the third open order in words by either method, and takes the basket by card once a slot is freed', () => {
        cy.step('the customer starts with one open order, and opens a second, by transfer');
        cy.loginAs('user');
        openOrders().should('equal', 1);
        checkoutWith('bank_transfer');
        cy.get('#order-target').should('exist');
        cy.get('[data-test=transfer-instructions-panel]').should('exist');
        idFromLocation().then((secondTransfer) => {
            openOrders().should('equal', 2);

            cy.step(
                'a third order is refused with a sentence about unpaid orders, and the cart stays'
            );
            putInCart();
            cy.goToCart();
            cy.get('[data-test=shipping-method-pickup]').click();
            cy.get('[data-test=payment-method-bank_transfer] label').click();
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('[data-test=cart-open-orders]').should('contain.text', 'unpaid orders');
            cy.get('[data-test=cart-open-order-link]').should('have.length', 2);
            cy.get('[data-test=cart-item]').should('have.length', 1);
            openOrders().should('equal', 2);

            cy.step('the same basket by card is refused the same way: the cap is per account');
            // The label, not the wrapper `data-test` sits on: the wrapper's centre can be empty space.
            cy.get('[data-test=payment-method-card] label').click();
            cy.get('[data-test=payment-method-card] input').should('be.checked');
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('[data-test=cart-open-orders]').should('contain.text', 'unpaid orders');
            cy.get('[data-test=cart-open-order-link]').should('have.length', 2);
            cy.get('[data-test=cart-item]').should('have.length', 1);
            openOrders().should('equal', 2);

            cy.step('cancelling one open order frees a slot, and the basket goes through by card');
            cy.visit(`/en/orders/${secondTransfer}`);
            cy.get('[data-test=order-cancel]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=order-cancel]').should('not.exist');
            openOrders().should('equal', 1);
            cy.goToCart();
            cy.get('[data-test=shipping-method-pickup]').click();
            cy.get('[data-test=payment-method-card] label').click();
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('#order-target').should('exist');
            openOrders().should('equal', 2);

            cy.step('the customer pays it, which leaves the open count where it was');
            cy.payWith('Card that pays');
            cy.get('[data-test=payment-status]').should('contain.text', 'Succeeded');
            openOrders().should('equal', 1);

            cy.step('and a new transfer is taken again');
            checkoutWith('bank_transfer');
            cy.get('#order-target').should('exist');
            cy.get('[data-test=transfer-instructions-panel]').should('exist');
            openOrders().should('equal', 2);
        });
    });
});
