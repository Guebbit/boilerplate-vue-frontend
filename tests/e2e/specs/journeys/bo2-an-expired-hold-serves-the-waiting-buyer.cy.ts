// requires-module: account, cart, inventory, orders, products
/**
 * @module
 * BO2 · An expired hold serves the buyer who waits. Someone holds the last unit and never pays; a
 * second buyer has paid for a backorder and waits. When the first hold runs out, its unit goes to
 * the buyer who paid, not to the next stranger.
 *
 * Demo only: the hold is a clock jump and the sweep is pulled with the job lever.
 *
 * Written against the live pages and not yet run in a browser: the first run may need its
 * selectors nudged.
 */
import { checkoutAs, eventually } from '../../../support/e2e/steps';

/** One hour in milliseconds, for the clock jump. */
const HOUR_MS = 3_600_000;

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** The slice of an order this story reads. */
interface OrderLike {
    id: string;
}

/** The slice of the delivery view this story reads. */
interface DeliveryLike {
    fulfillmentOrders: { status: string; holdReason?: string }[];
}

describe('BO2 · An expired hold serves the buyer who waits', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('hands the freed unit to the buyer who paid, oldest payment first', () => {
        cy.step('a product with one unit, backorder on, room for one more');
        cy.apiAs<{ id: string }>('editor', 'POST', '/products', {
            price: 19.9,
            allowBackorder: true,
            translations: { en: { title: `BO2 last unit ${unique()}` } }
        }).then((product) => {
            const id = String(product?.id);
            cy.apiAs('admin', 'PUT', `/inventory/levels/${id}/backorder-limit`, {
                backorderLimit: 1
            });
            cy.apiAs('admin', 'POST', '/inventory/receipts', { productId: id, quantity: 1 });

            cy.step('the customer holds the last unit and does not pay');
            cy.apiAs('user', 'POST', '/cart', { productId: id, quantity: 1 });
            cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
            checkoutAs<OrderLike>('user');

            cy.step('the admin backorders the same product and pays, so the claim waits');
            cy.apiAs('admin', 'POST', '/cart', { productId: id, quantity: 1 });
            cy.apiAs('admin', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
            checkoutAs<OrderLike>('admin').then((waiting) => {
                const waitingId = String(waiting?.id);
                cy.apiAs('admin', 'POST', `/payments/order/${waitingId}/offline`, {
                    method: 'cash'
                });

                cy.step('the first hold runs out and the sweep runs');
                cy.travel(24 * HOUR_MS);
                cy.runJob('sweep-reservations');

                cy.step('the paid buyer’s wait is released, not left for a stranger');
                eventually(
                    () => cy.apiAs<DeliveryLike>('admin', 'GET', `/delivery/order/${waitingId}`),
                    (view) =>
                        (view?.fulfillmentOrders.length ?? 0) > 0 &&
                        (view?.fulfillmentOrders.every(({ status }) => status !== 'on_hold') ??
                            false)
                );
            });
        });
    });
});
