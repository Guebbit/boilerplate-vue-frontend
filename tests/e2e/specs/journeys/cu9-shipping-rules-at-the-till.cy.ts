// requires-module: account, cart, delivery, inventory, orders, products
/**
 * @module
 * CU9 · Shipping rules at the till. The customer meets each rule the shop applies to delivery:
 * standard shipping turns free once the items reach the threshold, the picker only offers a
 * method the basket fits, a method the basket has outgrown is refused and the picker falls back,
 * pickup asks for no address, and an address outside the ship-to countries is refused at checkout
 * in its own words.
 *
 * The story is about the cart's answer, not the page's: every price is read in cents off the
 * screen, and the refusals are the server's (`CART_SHIPPING_METHOD_WEIGHT`,
 * `CART_SHIP_TO_COUNTRY_NOT_SUPPORTED`). Card budgets are untouched — nothing here pays.
 */
import {
    addToCartFromStorefront,
    shouldShowCents,
    fillAddressDialog,
    idFromLocation
} from '../../../support/e2e/steps';

describe('CU9 · Shipping rules at the till', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('prices, refuses and skips delivery by the rules: free threshold, weight, pickup, ship-to country', () => {
        cy.step('standard shipping costs something on one rich product, and nothing on two');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        cy.get('[data-test=shipping-method-standard]').click();
        shouldShowCents('[data-test=cart-shipping-cost]', (shipping) => {
            expect(shipping, 'one rich product is under the free-shipping line').to.be.greaterThan(
                0
            );
        });
        cy.get('[data-test=cart-item]').find('[data-test=cart-increase]').click();
        // The step is debounced, so the totals move once the request has landed.
        shouldShowCents('[data-test=cart-shipping-cost]', (shipping) => {
            expect(shipping, 'two rich products clear the free-shipping line').to.equal(0);
        });
        cy.get('[data-test=shipping-method-standard]').should('contain.text', 'free');

        cy.step('the cart carries a fitting method only: a heavy basket is offered no express');
        cy.get('[data-test=shipping-method-express]').should('exist');
        cy.subjectId('product.heavy').then((heavyId) => {
            // Added behind the open page's back, so its express radio is now stale — the refusal
            // below is what the server says to a choice the page still offers.
            cy.apiAs('user', 'POST', '/cart', { productId: heavyId, quantity: 1 });
        });
        cy.get('[data-test=shipping-method-express]').click();
        cy.contains('Your basket is too heavy for the chosen shipping method').should('be.visible');
        cy.get('[data-test=shipping-method-standard] input').should('be.checked');
        cy.get('[data-test=shipping-method-express] input').should('not.be.checked');

        cy.step('after a reload the heavy basket is offered standard and pickup, not express');
        cy.reload();
        cy.get('[data-test=cart-item]').should('have.length', 2);
        cy.get('[data-test=shipping-method-standard]').should('exist');
        cy.get('[data-test=shipping-method-pickup]').should('exist');
        cy.get('[data-test=shipping-method-express]').should('not.exist');

        cy.step('an address in a country the shop does not ship to is refused at checkout');
        cy.navigateViaMenu('account', '/en/profile');
        cy.get('[data-test=address-add]').click();
        fillAddressDialog({
            label: 'Holiday',
            fullName: 'Amélie Poulain',
            street: 'Rue Lepic 56',
            zip: '75018',
            city: 'Paris',
            country: 'France'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');
        cy.goToCart();
        cy.get('[data-test=shipping-method-standard]').click();
        cy.get('[data-test=address-picker]').contains('Rue Lepic').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.contains("We don't ship to that address's country").should('be.visible');
        cy.location('pathname').should('match', /\/cart$/);
        cy.get('[data-test=cart-item]').should('have.length', 2);

        cy.step('pickup asks for no address, and the order that follows carries none');
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=address-picker]').should('not.exist');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.get('[data-test=order-shipping-address]').should('not.exist');
        idFromLocation().then((orderId) => {
            cy.apiAs<{ shippingAddress?: unknown }>('user', 'GET', `/orders/${orderId}`).should(
                (order) => {
                    expect(order?.shippingAddress, 'a pickup order froze no address').to.equal(
                        undefined
                    );
                }
            );
        });
    });
});
