// requires-module: account, cart, inventory, orders, payments, products
/**
 * @module
 * OP9 · Expired holds are swept. A customer checks out by card and never pays; the thirty-minute
 * hold runs out; the admin presses the sweep button on the stock page.
 *
 * - The order is cancelled, its units return to the shelf, and the ledger says `expire`.
 * - The customer is mailed why, and the pay form is gone from the order.
 *
 * Demo only: time passes by moving the backend's clock, and no job runs by itself, so the
 * admin's own button is the trigger.
 */
import { addOpenProductToCart, idFromLocation } from '../../../support/e2e/steps';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** Past the default card hold (`NODE_RESERVATION_TTL_MINUTES`, 30). */
const PAST_CARD_HOLD_MS = 31 * 60_000;

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

/** The slice of a product this story reads: what a shopper could still buy. */
interface ProductLike {
    available: number;
}

describe('OP9 · Expired holds are swept', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the admin sweeps an unpaid card order: cancelled, units back, customer told', () => {
        // Its own product: the sweep releases EVERY expired hold, so a seeded product's shelf would
        // also gain the units the seed's unpaid orders hold.
        cy.createProduct({ title: `E2E OP9 ${Date.now()}`, onHand: 5 }).then(
            ({ id: productId }) => {
                const shelf = { before: 0 };

                cy.step('the customer checks out by card and does not pay');
                cy.loginAs('user');
                cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).then((product) => {
                    shelf.before = Number(product?.available);
                });
                cy.visit(`/en/products/${productId}`);
                addOpenProductToCart();
                cy.goToCart();
                cy.checkoutWith('pickup');
                cy.get('#order-target').should('exist');
                cy.get('[data-test=payment-submit]').should('exist');
                idFromLocation().then((orderId) => {
                    cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).should(
                        (product) => {
                            expect(
                                Number(product?.available),
                                'the hold took a unit'
                            ).to.be.lessThan(shelf.before);
                        }
                    );

                    cy.step('the hold runs out and the admin sweeps');
                    cy.travel(PAST_CARD_HOLD_MS);
                    cy.switchUser('admin');
                    cy.visit('/en/inventory');
                    cy.get('[data-test=sweep-submit]').click();
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test=sweep-error]').should('not.exist');

                    cy.step('the order is cancelled and the units are back');
                    cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`).should((order) => {
                        expect(order?.status).to.equal('cancelled');
                    });
                    cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).should(
                        (product) => {
                            expect(Number(product?.available)).to.equal(shelf.before);
                        }
                    );

                    cy.step('the ledger shows the release as an expiry');
                    cy.visit('/en/inventory');
                    cy.get('[data-test=movements-filter-reason]').click();
                    cy.get('[role=listbox] [role=option]')
                        .contains(/expire/i)
                        .click();
                    cy.get('[data-test=movement-reason]').should('have.length.at.least', 1);

                    cy.step('the customer is told why, and cannot pay any more');
                    cy.accountOf('user').then(({ email }) => {
                        cy.emailTo(email, (mail) => mailMentions(mail, 'payment not completed'));
                    });
                    cy.switchUser('user');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('[data-test=order-payment-status]').should('exist');
                    cy.get('[data-test=payment-submit]').should('not.exist');
                    cy.get('[data-test=order-cancel]').should('not.exist');
                });
            }
        );
    });
});
