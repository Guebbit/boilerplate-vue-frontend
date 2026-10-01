// requires-module: account, cart, delivery, inventory, orders, products
/**
 * @module
 * CU10 · A digital product, alone and mixed. A video course ships nothing, so a basket holding only
 * that asks for no shipping method and no address, says so in one line, and charges no delivery. Put a
 * physical product beside it and delivery comes back: a method and an address are asked for again.
 *
 * The free-shipping line counts the whole basket, course included, and the cart quotes exactly what
 * the order then charges. A shipping choice left behind by a basket that has since gone digital-only
 * (the last physical line removed) is ignored, not refused.
 *
 * The physical line is the made-to-order bowl (`product.noWithdrawal`, EU Art. 16(c)), so the same
 * order also proves that line carries its no-withdrawal notice and the digital one does not. Nothing
 * is paid: the story stops at the orders the checkout writes.
 */
import {
    addToCartFromStorefront,
    cents,
    centsOf,
    idFromLocation
} from '../../../support/e2e/steps';

/** The slice of an order this story reads: what it was charged for, and how it was to be sent. */
interface OrderLike {
    shippingCost?: number | null;
    shippingMethod?: string | null;
    items: unknown[];
}

describe('CU10 · A digital product, alone and mixed', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a course alone ships nothing; beside a physical line shipping is back and the whole basket is priced', () => {
        cy.step('the customer puts the digital course alone in the cart');
        cy.loginAs('user');
        addToCartFromStorefront('product.digital');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);

        cy.step('no shipping step, no address, no delivery cost: the basket can be bought at once');
        cy.get('[data-test=cart-summary]').should('exist');
        cy.get('[data-test=cart-no-shipping]').should('exist');
        cy.get('[data-test=shipping-selector]').should('not.exist');
        cy.get('[data-test=address-picker]').should('not.exist');
        cy.get('[data-test=cart-shipping-cost]').should('not.exist');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();

        // The order does still freeze the account's default address ("rides on the order unused",
        // BE `cart/services/checkout.ts`), so this step asserts the method and cost, not the address.
        cy.step('the order carries no delivery at all, and no no-withdrawal notice');
        cy.get('#order-target').should('exist');
        cy.get('[data-test=order-item-line-total]').should('have.length', 1);
        cy.get('[data-test=order-shipping]').should('not.exist');
        cy.get('[data-test=order-item-no-withdrawal]').should('not.exist');
        idFromLocation().then((orderId) => {
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.shippingMethod ?? null, 'nothing to ship by').to.equal(null);
                expect(order?.shippingCost ?? 0, 'nothing to charge for').to.equal(0);
            });
        });

        cy.step('the customer now buys the course together with the made-to-order bowl');
        addToCartFromStorefront('product.noWithdrawal');
        addToCartFromStorefront('product.digital');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 2);

        cy.step('shipping is back: standard, to the default address, and the whole basket counts');
        cy.get('[data-test=cart-no-shipping]').should('not.exist');
        cy.get('[data-test=shipping-method-standard]').click();
        cy.get('[data-test=address-picker]').should('exist');
        // Bowl 80 plus course 29: the basket as a whole is past standard's free-from-100 line.
        const cart = { items: 0, shipping: 0 };
        centsOf('[data-test=cart-items-total]').then((items) => {
            cart.items = items;
            expect(items).to.be.greaterThan(cents('100.00'));
        });
        centsOf('[data-test=cart-shipping-cost]').then((shipping) => {
            cart.shipping = shipping;
        });
        // Forced: the toasts of the two add-to-carts sit over the foot of the page, and the button
        // is at the foot. `not.be.disabled` still guards it.
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click({ force: true });

        cy.step(
            'the order charges what the cart quoted, and only the bowl cannot be withdrawn from'
        );
        cy.get('#order-target').should('exist');
        cy.get('[data-test=order-item-line-total]').should('have.length', 2);
        cy.get('[data-test=order-shipping]').should('exist');
        cy.get('[data-test=order-shipping-address]').should('exist');
        cy.get('[data-test=order-item-no-withdrawal]').should('have.length', 1);
        centsOf('[data-test=order-shipping]').should((shipping) => {
            expect(shipping, 'the order froze the quote').to.equal(cart.shipping);
            expect(shipping, 'free: the whole basket is past the line').to.equal(0);
        });
        idFromLocation().then((orderId) => {
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.shippingMethod).to.equal('standard');
                expect(order?.items).to.have.length(2);
            });
        });

        cy.step('a choice left behind by a basket that went digital-only is ignored at checkout');
        addToCartFromStorefront('product.noWithdrawal');
        addToCartFromStorefront('product.digital');
        cy.goToCart();
        cy.get('[data-test=shipping-method-standard]').click();
        cy.subjectProduct('product.noWithdrawal').then(({ title }) => {
            cy.contains('[data-test=cart-item]', title).find('[data-test=cart-remove]').click();
        });
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.get('[data-test=cart-no-shipping]').should('exist');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click({ force: true });
        cy.get('#order-target').should('exist');
        cy.get('[data-test=order-shipping]').should('not.exist');
    });
});
