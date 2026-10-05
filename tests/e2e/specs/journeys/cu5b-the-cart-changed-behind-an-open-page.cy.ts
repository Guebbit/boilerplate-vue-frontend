// requires-module: account, cart, inventory, products
/**
 * @module
 * CU5b · The cart changed on the server behind an open page. The customer has the cart open with
 * two units. A second tab, played here by the API, raises the line to five. Coming back to the
 * page (the window gets focus) reads the cart again, so the screen says five before "Place order"
 * acts on it.
 *
 * The customer who never leaves the page is the second story (F4). "Place order" carries the total
 * the screen showed, so when the editor reprices the product behind the open page the server
 * refuses (409, nothing written), the page says the total changed and shows the new one, and the
 * next press, which now confirms that total, places the order at it.
 */
import {
    addToCartFromStorefront,
    centsOf,
    idFromLocation,
    shouldShowCents
} from '../../../support/e2e/steps';

/** The slice of a product this story reads. */
interface ProductLike {
    price: number;
}

/** The slice of an order this story reads. */
interface OrderLike {
    totalPrice: number;
}

/** What the editor adds to the price behind the open page, in cents. */
const RAISE_CENTS = 1200;

/** What the cart page showed for the line. */
const SHOWN_UNITS = 2;

/** What the other tab raised it to. */
const OTHER_TAB_UNITS = 5;

describe('CU5b · The cart changed behind an open page', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the server cart again when the customer comes back to the page', () => {
        cy.subjectId('product.rich').then((productId) => {
            cy.loginAs('user');
            addToCartFromStorefront('product.rich');
            cy.goToCart();
            // The step is debounced: wait for its request, so the other tab's write comes after it.
            cy.intercept('PUT', '**/cart/*').as('step');
            cy.get('[data-test=cart-increase]').click();
            cy.wait('@step');
            cy.get('[data-test=cart-item]').should('contain.text', `Quantity: ${SHOWN_UNITS}`);

            cy.step('the other tab sets the line to five, through the API');
            cy.apiAs('user', 'PUT', `/cart/${productId}`, { quantity: OTHER_TAB_UNITS });

            cy.step('the customer comes back to this page: it reads the cart again');
            cy.window().then((win) => {
                win.dispatchEvent(new Event('focus'));
            });
            cy.get('[data-test=cart-item]').should('contain.text', `Quantity: ${OTHER_TAB_UNITS}`);
        });
    });

    it('refuses an order placed at a total the page no longer has, shows the new one, and places it on the second press', () => {
        cy.subjectId('product.rich').then((productId) => {
            cy.subjectProduct('product.rich').then(({ price }) => {
                const shown = Math.round(price * 100);
                const raised = shown + RAISE_CENTS;

                cy.loginAs('user');
                addToCartFromStorefront('product.rich');
                cy.goToCart();
                // `pickup` needs no address, so choosing it alone enables the button.
                cy.get('[data-test=shipping-method-pickup]').click();
                cy.get('[data-test=cart-checkout]').should('not.be.disabled');
                centsOf('[data-test=cart-total]').should('equal', shown);

                cy.step('the editor raises the price while the page stays open');
                cy.apiAs<ProductLike>('editor', 'PATCH', `/products/${productId}`, {
                    price: raised / 100
                });

                cy.step('the customer presses "Place order": refused, and the page says why');
                // Forced: the toasts of earlier steps can sit over the foot of the page.
                cy.get('[data-test=cart-checkout]').click({ force: true });
                cy.contains('The total changed from').should('exist');
                shouldShowCents('[data-test=cart-total]', (amount) => {
                    expect(amount, 'the page now shows the new total').to.equal(raised);
                });
                cy.location('pathname').should('contain', '/cart');
                cy.apiAs<{ items: unknown[] }>('user', 'GET', '/cart').should((cart) => {
                    expect(
                        cart?.items,
                        'nothing was ordered: the cart is still full'
                    ).to.have.length.greaterThan(0);
                });

                cy.step('pressing again confirms the new total, and the order is placed at it');
                cy.get('[data-test=cart-checkout]')
                    .should('not.be.disabled')
                    .click({ force: true });
                cy.get('#order-target').should('exist');
                idFromLocation().then((orderId) => {
                    cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                        expect(Math.round((order?.totalPrice ?? 0) * 100)).to.equal(raised);
                    });
                });
            });
        });
    });
});
