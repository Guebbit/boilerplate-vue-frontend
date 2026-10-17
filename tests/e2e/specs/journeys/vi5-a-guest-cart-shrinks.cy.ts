// requires-module: cart, products
/**
 * @module
 * VI5 · A guest cart shrinks. A visitor with no account fills a cart, then the shop changes under
 * them: a product is repriced, one is pulled, one is taken off sale. The browser keeps only what the
 * guest chose (which products, how many); the price and the state of every line are read live, so
 * each change shows after a reload. The visitor steps a line down, removes one, and clears the cart.
 *
 * The story is about the browser copy never being trusted for money. The editor changes the shop
 * through the API, where the story needs it to move.
 */
import { GUEST_CART_KEY, cents, searchAndOpenProduct } from '../../../support/e2e/steps';

/** The badge's own bubble, the one place the unit count is written. */
const BAR_COUNT = '[data-test=nav-badge] .v-badge__badge';

/** One line's cart text, `unit × quantity = total`, split into cents. */
const priceOf = (text: string): { unit: number; total: number } => {
    const [product = '', total = ''] = text.split('=');
    const [unit = ''] = product.split('×');
    return { unit: cents(unit), total: cents(total) };
};

/**
 * As a guest, opens a seeded product's page from the storefront and adds it to the cart once.
 *
 * @param name - a `product.*` guarantee name
 */
const guestAdds = (name: string): void => {
    cy.visit('/en/products');
    searchAndOpenProduct(name);
    cy.get('[data-test=add-to-cart]').click();
};

describe('VI5 · A guest cart shrinks', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('prices and states are read live, the lines step down and go, and clearing empties the browser copy', () => {
        cy.subjectProduct('product.inStock').then((stocked) => {
            cy.subjectProduct('product.barebones').then((bare) => {
                cy.subjectProduct('product.rich').then((rich) => {
                    cy.step('a guest adds three products; each line shows the API price');
                    for (const name of ['product.inStock', 'product.barebones', 'product.rich'])
                        guestAdds(name);
                    cy.get(BAR_COUNT).should('have.text', '3');
                    cy.goToCart();
                    cy.get('[data-test=guest-cart-item]').should('have.length', 3);
                    for (const product of [stocked, bare, rich])
                        cy.contains('[data-test=guest-cart-item]', product.title)
                            .find('[data-test=guest-cart-line-price]')
                            .should(($line) => {
                                expect(priceOf($line.text()).unit).to.equal(
                                    Math.round(product.price * 100)
                                );
                            });
                    cy.get('[data-test=guest-cart-total]').should(($total) => {
                        expect(cents($total.text())).to.equal(
                            Math.round((stocked.price + bare.price + rich.price) * 100)
                        );
                    });

                    cy.step(
                        'the editor reprices one: a reload shows the new price, not the old one'
                    );
                    const repriced = Math.round((bare.price + 1) * 100) / 100;
                    cy.apiAs('editor', 'PATCH', `/products/${bare.id}`, { price: repriced });
                    cy.reload();
                    cy.contains('[data-test=guest-cart-item]', bare.title)
                        .find('[data-test=guest-cart-line-price]')
                        .should(($line) => {
                            expect(priceOf($line.text()).unit).to.equal(Math.round(repriced * 100));
                        });
                    cy.get('[data-test=guest-cart-total]').should(($total) => {
                        expect(cents($total.text())).to.equal(
                            Math.round((stocked.price + repriced + rich.price) * 100)
                        );
                    });

                    cy.step(
                        'a line steps down to one and stops; another is removed; a reload keeps both'
                    );
                    cy.contains('[data-test=guest-cart-item]', stocked.title)
                        .find('[data-test=guest-cart-increase]')
                        .click();
                    cy.contains('[data-test=guest-cart-item]', stocked.title)
                        .find('[data-test=guest-cart-decrease]')
                        .click();
                    cy.contains('[data-test=guest-cart-item]', stocked.title)
                        .find('[data-test=guest-cart-decrease]')
                        .should('be.disabled');
                    cy.contains('[data-test=guest-cart-item]', rich.title)
                        .find('[data-test=guest-cart-remove]')
                        .click();
                    cy.get('[data-test=guest-cart-item]').should('have.length', 2);
                    cy.get(BAR_COUNT).should('have.text', '2');
                    cy.reload();
                    cy.get('[data-test=guest-cart-item]').should('have.length', 2);
                    cy.get(BAR_COUNT).should('have.text', '2');

                    cy.step('the editor pulls one: after a reload it is marked gone');
                    cy.apiAs('editor', 'DELETE', `/products/${bare.id}`);
                    cy.reload();
                    cy.get('[data-test=guest-cart-item]').should('have.length', 2);
                    cy.get('[data-test=guest-cart-line-removed]')
                        .should('have.length', 1)
                        .and('contain.text', 'No longer available');

                    cy.step(
                        'the editor takes the other off sale: it carries the cart’s own marker'
                    );
                    cy.apiAs('editor', 'PATCH', `/products/${stocked.id}`, { purchasable: false });
                    cy.reload();
                    cy.get('[data-test=guest-cart-line-unavailable]').should(
                        'contain.text',
                        'Not available right now'
                    );

                    cy.step('clearing asks first, then empties the cart and the browser copy');
                    cy.get('[data-test=guest-cart-clear]').click();
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test=guest-cart-item]').should('not.exist');
                    cy.window().then((win) => {
                        expect(win.localStorage.getItem(GUEST_CART_KEY)).to.equal(null);
                    });
                });
            });
        });
    });
});
