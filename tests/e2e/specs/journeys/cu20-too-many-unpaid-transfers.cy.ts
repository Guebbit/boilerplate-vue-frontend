// requires-module: account, cart, inventory, orders, payments, products
/**
 * @module
 * CU20 · Too many unpaid transfers. A bank-transfer order holds its stock for a week, so the shop
 * caps how many one account may have open at once (two by default). The seeded customer already
 * has one. A second transfer goes through; a third is refused with a sentence about transfers,
 * not a generic error, and the cart survives. The same basket goes through by card, and cancelling
 * one of the open transfers frees a slot for another.
 *
 * One card confirm is spent, as `user`.
 */
import { addToCartFromStorefront, idFromLocation } from '../../../support/e2e/steps';

/** The slice of an order this story reads: where it stands and how it is to be paid. */
interface OrderLike {
    status: string;
    paymentMethod: string;
}

/** A page of orders, as the list endpoint answers. */
interface OrdersPage {
    items: OrderLike[];
}

/**
 * How many bank-transfer orders the customer has open: placed and not yet paid or cancelled.
 *
 * @returns a chain yielding the count
 */
const openTransfers = (): Cypress.Chainable<number> =>
    cy
        .apiAs<OrdersPage>('user', 'GET', '/orders?pageSize=100')
        .then(
            (page) =>
                (page?.items ?? []).filter(
                    ({ status, paymentMethod }) =>
                        status === 'pending' && paymentMethod === 'bank_transfer'
                ).length
        );

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

describe('CU20 · Too many unpaid transfers', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refuses the third open transfer in words, takes the same basket by card, and frees a slot on cancel', () => {
        cy.step('the customer starts with one open transfer, and opens a second');
        cy.loginAs('user');
        openTransfers().should('equal', 1);
        checkoutWith('bank_transfer');
        cy.get('#order-target').should('exist');
        cy.get('[data-test=transfer-instructions-panel]').should('exist');
        idFromLocation().then((secondTransfer) => {
            openTransfers().should('equal', 2);

            cy.step(
                'a third transfer is refused with a sentence about transfers, and the cart stays'
            );
            putInCart();
            cy.goToCart();
            cy.get('[data-test=shipping-method-pickup]').click();
            cy.get('[data-test=payment-method-bank_transfer] label').click();
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('[data-test=cart-checkout-error]').should('contain.text', 'transfer');
            cy.get('[data-test=cart-item]').should('have.length', 1);
            openTransfers().should('equal', 2);

            cy.step('the same basket goes through by card, and the customer pays it');
            // The label, not the wrapper `data-test` sits on: the wrapper's centre can be empty space.
            cy.get('[data-test=payment-method-card] label').click();
            cy.get('[data-test=payment-method-card] input').should('be.checked');
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('#order-target').should('exist');
            cy.payWith('Card that pays');
            cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
            openTransfers().should('equal', 2);

            cy.step('cancelling one open transfer frees a slot');
            cy.visit(`/en/orders/${secondTransfer}`);
            cy.get('[data-test=order-cancel]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=order-cancel]').should('not.exist');
            openTransfers().should('equal', 1);

            cy.step('and a new transfer is taken again');
            checkoutWith('bank_transfer');
            cy.get('#order-target').should('exist');
            cy.get('[data-test=transfer-instructions-panel]').should('exist');
            openTransfers().should('equal', 2);
        });
    });
});
