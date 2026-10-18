// requires-module: account, cart, delivery, inventory, orders, products
/**
 * @module
 * BO1 · The buyer backorders. A released product with an empty shelf, backorder switched on and
 * room under its limit, is bought like any other: the page says "Backorder" with its promise, the
 * cart line says so too, the placed order names what is owed and by when, and stock arriving serves
 * the order: the owed part is released and ships.
 *
 * Written against the live pages and not yet run in a browser: the first run may need its
 * selectors nudged.
 */
import {
    checkoutAs,
    createProductThroughTheForm,
    releaseDateIn,
    eventually,
    shipThroughTheApi
} from '../../../support/e2e/steps';

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** The slice of an order this story reads. */
interface OrderLike {
    id: string;
    items: { quantity: number; backorderedQuantity?: number; promiseDated?: boolean }[];
}

/** The slice of the delivery view this story reads. */
interface DeliveryLike {
    fulfillmentOrders: { status: string; holdReason?: string }[];
}

describe('BO1 · The buyer backorders', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('is offered Backorder with its promise, owes the part the shelf lacks, and is served when stock arrives', () => {
        cy.step(
            'the editor makes a product that keeps selling when out of stock, with a restock date'
        );
        cy.loginAs('editor');
        createProductThroughTheForm(`BO1 backorder ${unique()}`).then((id) => {
            cy.apiAs('editor', 'PATCH', `/products/${id}`, {
                allowBackorder: true,
                restockDate: new Date(Date.parse(releaseDateIn(20))).toISOString()
            });
            cy.step('the admin puts one unit on the shelf and opens room for backorders');
            cy.apiAs('admin', 'PUT', `/inventory/levels/${id}/backorder-limit`, {
                backorderLimit: 5
            });
            cy.apiAs('admin', 'POST', '/inventory/receipts', { productId: id, quantity: 1 });

            cy.step('the customer wants two: one is on the shelf, one is owed');
            cy.switchUser('user');
            cy.apiAs('user', 'POST', '/cart', { productId: id, quantity: 2 });
            cy.visit('/en/cart');
            cy.get('[data-test=cart-line-availability]').should('contain.text', 'Backorder');

            cy.step('the order freezes what is owed and the date promised');
            cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
            checkoutAs<OrderLike>('user').then((order) => {
                const orderId = String(order?.id);
                expect(order?.items[0]?.backorderedQuantity).to.equal(1);
                expect(order?.items[0]?.promiseDated).to.equal(true);
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=order-item-owed]').should('contain.text', 'backorder');

                cy.step('the order is paid; the owed part waits for stock on its own');
                cy.apiAs('admin', 'POST', `/payments/order/${orderId}/offline`, { method: 'cash' });
                eventually(
                    () => cy.apiAs<DeliveryLike>('admin', 'GET', `/delivery/order/${orderId}`),
                    (view) => (view?.fulfillmentOrders.length ?? 0) === 2
                ).then((view) => {
                    const held = view?.fulfillmentOrders.filter(
                        ({ holdReason }) => holdReason === 'awaiting_stock'
                    );
                    expect(held).to.have.length(1);
                });

                cy.step('stock arrives: the wait is released, and everything ships');
                cy.apiAs('admin', 'POST', '/inventory/receipts', { productId: id, quantity: 1 });
                eventually(
                    () => cy.apiAs<DeliveryLike>('admin', 'GET', `/delivery/order/${orderId}`),
                    (view) =>
                        view?.fulfillmentOrders.every(({ status }) => status !== 'on_hold') ?? false
                );
                shipThroughTheApi(orderId, 'BO1-TRACK');
            });
        });
    });
});
