// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * CU32 · My transfer was never paid. The customer checks out by bank transfer and is told how long
 * the shop holds the stock. The admin sees the order on the awaiting-transfer list. The hold runs
 * out with no money: the order is cancelled, the customer's page offers nothing to pay or cancel,
 * and the order leaves the awaiting list.
 *
 * Then the money turns up late. The admin finds the cancelled order by the reference the customer
 * was given, records the transfer, and the payment lists it as money to hand back.
 *
 * Demo only: the hold is a clock jump and the sweep is pulled with the job lever. The mail, the
 * stock count and the ledger row that follow are the sweep's integration test's.
 */
import { addToCartFromStorefront, idFromLocation } from '../../../support/e2e/steps';

/** How long the demo holds stock for a transfer (`NODE_BANK_TRANSFER_HOLD_HOURS`), in hours. */
const HOLD_HOURS = 168;

/** One hour in milliseconds, for the clock jump. */
const HOUR_MS = 3_600_000;

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

describe('CU32 · My transfer was never paid', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the hold runs out with no money, and the order is cancelled and leaves the awaiting list', () => {
        cy.step('the customer checks out by bank transfer and reads how long the stock is held');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=payment-method-bank_transfer]').click();
        cy.get('[data-test=payment-method-hold-hours]').should(
            'contain.text',
            `reserved for ${HOLD_HOURS}h`
        );
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.get('[data-test=transfer-deadline]').invoke('text').should('not.be.empty');
        cy.get('[data-test=transfer-reference]')
            .invoke('text')
            .then((text) => text.replaceAll(/\s+/g, ''))
            .as('reference');
        idFromLocation().then((orderId) => {
            cy.step('the admin finds it on the awaiting-transfer list');
            cy.switchUser('admin');
            cy.visit('/en/sales/orders');
            cy.get('[data-test=filter-awaiting-transfer] input').check();
            cy.get('form button[type=submit]').click();
            cy.get(`[data-test=row-view][href$="/orders/${orderId}"]`).should('exist');

            cy.step('the hold runs out and the sweep runs');
            cy.travel(HOLD_HOURS * HOUR_MS + 10 * 60_000);
            cy.runJob('sweep-reservations');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'cancelled');

            cy.step('the customer’s page is cancelled, with nothing to pay or cancel');
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=transfer-instructions-panel]').should('not.exist');
            cy.get('[data-test=payment-submit]').should('not.exist');
            cy.get('[data-test=order-cancel]').should('not.exist');

            cy.step('and the order has left the awaiting-transfer list');
            cy.switchUser('admin');
            cy.visit('/en/sales/orders');
            cy.get('[data-test=filter-awaiting-transfer] input').check();
            cy.get('form button[type=submit]').click();
            cy.settleNetwork();
            cy.get(`[data-test=row-view][href$="/orders/${orderId}"]`).should('not.exist');

            cy.step('the money arrives late: the reference still finds the cancelled order');
            cy.get<string>('@reference').then((reference) => {
                cy.visit('/en/sales/orders');
                cy.get('[data-test=order-reference-search-input] input').type(reference);
                cy.get('[data-test=order-reference-search-submit]').click();
                cy.url().should('match', new RegExp(`/orders/${orderId}/edit$`));
            });

            cy.step('recording the transfer settles the payment, which is then owed back');
            cy.apiAs('admin', 'POST', `/payments/order/${orderId}/offline`, {
                method: 'bank_transfer',
                reference: 'LATE-TRANSFER-1'
            });

            cy.step('and the payments page lists it as money to hand back');
            cy.visit('/en/sales/payments');
            cy.get('[data-test=payments-tab-attention]').click();
            cy.contains('Money to hand back outside the system').should('exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'cancelled');
        });
    });
});
