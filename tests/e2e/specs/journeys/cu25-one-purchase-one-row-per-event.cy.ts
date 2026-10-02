// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * CU25 · One purchase, one analytics row per event. A customer who has agreed to analytics buys
 * something: the card is declined, the retry pays, and then the customer cancels. Umami holds
 * exactly one row for each thing that happened (`checkout_completed`, `order_created`,
 * `payment_declined`, `payment_succeeded`, `order_cancelled`), not none and not two.
 *
 * Live only: the demo profile has no Umami behind it. All five names are the backend's. This
 * frontend emits no event of its own, so a delta of one cannot come from the browser, and a
 * delta of two would be the backend emitting twice. Measured as a delta from the story's start,
 * for the reason `analytics.cy.ts` gives: whatever the rest of the suite wrote a minute ago is not
 * this story's business.
 *
 * "Exactly one" is asserted after waiting for AT LEAST one of each: waiting for a count to stop
 * rising cannot be told apart from a second write that has not landed yet.
 */
import { addToCartFromStorefront } from '../../../support/e2e/steps';
import { eventCounts, umamiSession, waitForEvent } from '../../../support/e2e/umami';

/** The five rows one purchase leaves, in the order the story makes them. */
const EVENTS = [
    'order_created',
    'checkout_completed',
    'payment_declined',
    'payment_succeeded',
    'order_cancelled'
] as const;

describe('CU25 · One purchase, one analytics row per event', () => {
    beforeEach(() => {
        // The demo profile has no Umami behind it, so there is nothing to count.
        cy.skipUnlessLive();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('records each step of a declined, paid and cancelled purchase exactly once', () => {
        const since = Date.now() - 60 * 1000;

        cy.step('the customer has agreed to analytics, and Umami is read before the purchase');
        cy.apiAs('user', 'PATCH', '/account', { analyticsConsent: true });
        umamiSession().then((session) => {
            eventCounts(session, since).then((before) => {
                cy.step('the customer checks out');
                cy.loginAs('user');
                addToCartFromStorefront('product.rich');
                cy.goToCart();
                // `pickup` needs no address, so the method alone enables the button.
                cy.get('[data-test=shipping-method-pickup]').click();
                cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
                cy.get('#order-target').should('exist');

                cy.step('the first card is declined, the second pays');
                cy.payWith('Card the issuer declines');
                cy.get('[data-test=payment-panel-error]').should('exist');
                cy.payWith('Card that pays');
                cy.get('[data-test=payment-status]').should('contain.text', 'Paid');

                cy.step('the customer cancels the paid order');
                cy.get('[data-test=order-cancel]').click();
                cy.get('[data-test=app-dialog-confirm]').click();
                cy.get('[data-test=order-cancel]').should('not.exist');

                cy.step('Umami holds one new row for each of the five events');
                for (const name of EVENTS)
                    waitForEvent(session, since, name, (before[name] ?? 0) + 1);
                eventCounts(session, since).then((after) => {
                    for (const name of EVENTS)
                        expect(
                            (after[name] ?? 0) - (before[name] ?? 0),
                            `${name} rows this purchase wrote`
                        ).to.equal(1);
                });
            });
        });
    });
});
