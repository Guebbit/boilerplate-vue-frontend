// requires-module: account, cart, inventory, orders, products
/**
 * @module
 * CU5 · The price moves while it sits in the cart. A customer puts a product in the cart; the
 * editor, on another account, reprices it. The cart is live: reloaded, it shows the new price and the
 * new total. The order is not: it freezes the price at checkout, and a second repricing afterwards
 * leaves what the customer agreed to pay alone.
 *
 * The customer never pays, so no card budget is spent. The editor is the first journey to use that
 * login, and works through the API: it is the background, not the subject.
 */
import {
    addToCartFromStorefront,
    cents,
    centsOf,
    idFromLocation
} from '../../../support/e2e/steps';

/** The slice of a product this story reads. */
interface ProductLike {
    price: number;
}

/**
 * The cents of a cart line's unit price: the text before the multiplication sign.
 *
 * @param text - the line's `unit × quantity = total` text
 */
const unitCents = (text: string): number => cents(text.split('×')[0] ?? '');

describe('CU5 · The price moves while it sits in the cart', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the cart follows a repricing; the order keeps the price it was placed at', () => {
        cy.step('the customer puts a product in the cart and reads its price');
        cy.loginAs('user');
        cy.subjectId('product.rich').then((productId) => {
            cy.subjectProduct('product.rich').then(({ price }) => {
                const before = cents(price.toFixed(2));
                const raised = before + 1200;
                const lowered = before - 800;

                addToCartFromStorefront('product.rich');
                cy.goToCart();
                cy.get('[data-test=cart-line-price]')
                    .invoke('text')
                    .should((text) => {
                        expect(unitCents(text)).to.equal(before);
                    });

                cy.step('the editor raises the price; the customer reloads and the cart follows');
                cy.apiAs<ProductLike>('editor', 'PATCH', `/products/${productId}`, {
                    price: raised / 100
                });
                cy.reload();
                cy.get('[data-test=cart-line-price]')
                    .invoke('text')
                    .should((text) => {
                        expect(unitCents(text), 'the line shows the new price').to.equal(raised);
                    });
                centsOf('[data-test=cart-items-total]').should('equal', raised);

                cy.step('the customer checks out at the new price');
                // `pickup` needs no address, so choosing it alone enables the button.
                cy.get('[data-test=shipping-method-pickup]').click();
                cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
                cy.get('#order-target').should('exist');
                centsOf('[data-test=order-item-unit-price]').should('equal', raised);

                cy.step('the editor reprices again; the order still says what was agreed');
                cy.apiAs<ProductLike>('editor', 'PATCH', `/products/${productId}`, {
                    price: lowered / 100
                });
                cy.reload();
                cy.get('#order-target').should('exist');
                centsOf('[data-test=order-item-unit-price]').should('equal', raised);
                idFromLocation().then((orderId) => {
                    cy.apiAs<{ items: { product: { price: number } }[] }>(
                        'user',
                        'GET',
                        `/orders/${orderId}`
                    ).should((order) => {
                        expect(order?.items[0]?.product.price).to.equal(raised / 100);
                    });
                });
            });
        });
    });
});
