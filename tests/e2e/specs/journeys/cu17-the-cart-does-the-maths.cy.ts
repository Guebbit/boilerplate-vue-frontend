// requires-module: cart, delivery, inventory, products
/**
 * @module
 * CU17 · The cart does the maths. The customer adds one product from a grid card and another from
 * its detail page, steps a quantity up and down fast, removes a line, clears the cart, and follows
 * the empty state back to the catalogue.
 *
 * The story is about every number agreeing with every other: the bar's count and money follow each
 * step, a line's price times its quantity is its total, items plus shipping is the total, and three
 * quick clicks cost the API exactly one request carrying the number the customer stopped on. Money
 * is compared in cents. Nothing here pays.
 */
import {
    addOpenProductToCart,
    cents,
    searchAndOpenProduct,
    shouldShowCents
} from '../../../support/e2e/steps';

/** The bar's money beside the cart, before shipping. */
const BAR_MONEY = '[data-test=nav-detail]';

/** The bar's badge wrapper — it carries the `data-test` only while there is a count to show. */
const BAR_BADGE = '[data-test=nav-badge]';

/** The badge's own bubble, the one place the unit count is written (Vuetify gives it no hook). */
const BAR_COUNT = `${BAR_BADGE} .v-badge__badge`;

/**
 * Splits a line's `unit × quantity = total` text into the three numbers it carries.
 *
 * @param text - what the line's price element shows
 * @returns the unit price and the line total in cents, and the quantity
 */
const readLine = (text: string): { unit: number; quantity: number; total: number } => {
    const [product = '', total = ''] = text.split('=');
    const [unit = '', quantity = ''] = product.split('×');
    return { unit: cents(unit), quantity: Number(quantity.trim()), total: cents(total) };
};

describe('CU17 · The cart does the maths', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the bar, the lines and the totals agree through every step, and quick clicks cost one request', () => {
        cy.step('adds one product from its grid card');
        cy.loginAs('user');
        cy.subjectProduct('product.barebones').then((bottle) => {
            cy.subjectProduct('product.rich').then((food) => {
                const bottleCents = Math.round(bottle.price * 100);
                const foodCents = Math.round(food.price * 100);

                cy.navigateTo('/en/products');
                cy.get('[data-test=filter-text] input').type(`${bottle.title}{enter}`);
                cy.intercept('POST', '**/cart').as('addToCart');
                cy.contains('[data-test=product-card]', bottle.title)
                    .find('[data-test=add-to-cart]')
                    .click();
                cy.wait('@addToCart').its('response.statusCode').should('be.within', 200, 299);
                cy.get(BAR_COUNT).should('have.text', '1');
                shouldShowCents(BAR_MONEY, (money) => {
                    expect(money, 'the bar shows the bottle').to.equal(bottleCents);
                });

                cy.step('adds another from its detail page');
                cy.visit('/en/products');
                searchAndOpenProduct('product.rich');
                addOpenProductToCart();
                cy.get(BAR_COUNT).should('have.text', '2');
                shouldShowCents(BAR_MONEY, (money) => {
                    expect(money, 'the bar shows both').to.equal(bottleCents + foodCents);
                });

                cy.step('steps the food up three times and down once, fast');
                cy.goToCart();
                cy.get('[data-test=cart-item]').should('have.length', 2);
                cy.intercept('PUT', `**/cart/${food.id}`).as('setQuantity');
                cy.contains('[data-test=cart-item]', food.title).within(() => {
                    cy.get('[data-test=cart-increase]').click();
                    cy.get('[data-test=cart-increase]').click();
                    cy.get('[data-test=cart-increase]').click();
                    cy.get('[data-test=cart-decrease]').click();
                });
                cy.wait('@setQuantity').its('request.body.quantity').should('equal', 3);
                // The debounce has fired; nothing else may follow it.
                cy.get('@setQuantity.all').should('have.length', 1);
                cy.get(BAR_COUNT).should('have.text', '4');

                cy.step('every line: unit price times quantity is its total');
                cy.contains('[data-test=cart-item]', food.title)
                    .find('[data-test=cart-line-price]')
                    .should(($line) => {
                        const { unit, quantity, total } = readLine($line.text());
                        expect(unit, 'the unit price').to.equal(foodCents);
                        expect(quantity, 'the quantity the clicks landed on').to.equal(3);
                        expect(total, 'price times quantity').to.equal(unit * quantity);
                    });

                cy.step('the summary: items plus shipping is the total');
                // Express is a flat price and needs an address, which the seeded customer has.
                cy.get('[data-test=shipping-method-express]').click();
                shouldShowCents('[data-test=cart-items-total]', (items) => {
                    expect(items, 'the items').to.equal(bottleCents + 3 * foodCents);
                });
                shouldShowCents('[data-test=cart-shipping-cost]', (shipping) => {
                    expect(shipping, 'express costs something').to.be.greaterThan(0);
                });
                cy.get('[data-test=cart-shipping-cost]').then(($shipping) => {
                    shouldShowCents('[data-test=cart-total]', (total) => {
                        expect(total, 'items plus shipping').to.equal(
                            bottleCents + 3 * foodCents + cents($shipping.text())
                        );
                    });
                });

                cy.step('removes the bottle, and the bar follows');
                cy.contains('[data-test=cart-item]', bottle.title)
                    .find('[data-test=cart-remove]')
                    .click();
                cy.get('[data-test=cart-item]').should('have.length', 1);
                cy.get(BAR_COUNT).should('have.text', '3');
                shouldShowCents(BAR_MONEY, (money) => {
                    expect(money, 'the bar shows the food alone').to.equal(3 * foodCents);
                });

                cy.step(
                    'clears the cart: no count, and the empty state leads back to the catalogue'
                );
                cy.get('[data-test=cart-clear]').click();
                cy.get('[data-test=cart-item]').should('not.exist');
                cy.get(BAR_BADGE).should('not.exist');
                cy.contains('Browse products').click();
                cy.get('#products-list-page').should('exist');
                cy.location('pathname').should('match', /\/products$/);
            });
        });
    });
});
