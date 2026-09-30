// requires-module: cart, inventory, products, wishlist
/**
 * @module
 * CU18 · The wishlist, from both doors. The customer saves a product from a grid card and finds it
 * saved on its detail page, removes it on the wishlist page, empties the list and follows the empty
 * state back to the catalogue — then saves two and moves one to a cart that already holds it.
 *
 * The story is about the heart telling one truth wherever it is drawn: the card, the detail page
 * and the list agree, and move-to-cart adds on top of what the cart already had. Every claim about
 * the list is read back from the API for the same account. Nothing here pays.
 */
import { addOpenProductToCart, searchAndOpenProduct } from '../../../support/e2e/steps';

/** What a saved product's heart says. */
const SAVED = 'Saved';

/** What an unsaved product's heart says. */
const NOT_SAVED = 'Save to wishlist';

/** The wishlist as the API serves it, as far as this journey reads. */
interface WishlistBody {
    items: { productId: string }[];
}

/**
 * Narrows the products list to one product by its title, the way a shopper would.
 *
 * @param title - the product's title
 */
const searchProducts = (title: string): void => {
    cy.get('[data-test=filter-text] input').clear();
    cy.get('[data-test=filter-text] input').type(`${title}{enter}`);
    cy.contains('[data-test=product-card]', title).should('exist');
};

describe('CU18 · The wishlist, from both doors', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the heart agrees on the card, the detail page and the list; move-to-cart adds on top of the cart', () => {
        cy.loginAs('user');
        cy.subjectProduct('product.barebones').then((bottle) => {
            cy.subjectProduct('product.rich').then((food) => {
                cy.env(['apiUrl']).then(({ apiUrl }) => {
                    cy.intercept('PUT', `${String(apiUrl)}/wishlist/*`).as('save');
                });

                cy.step('saves a product from its grid card');
                cy.navigateTo('/en/products');
                searchProducts(bottle.title);
                cy.contains('[data-test=product-card]', bottle.title)
                    .find('[data-test=wishlist-toggle]')
                    .as('cardHeart')
                    .should('contain.text', NOT_SAVED);
                cy.get('@cardHeart').click();
                cy.wait('@save').its('response.statusCode').should('eq', 200);
                cy.get('@cardHeart').should('contain.text', SAVED);

                cy.step('the detail page already shows it saved');
                cy.contains('[data-test=product-card]', bottle.title)
                    .find('[data-test=product-card-link]')
                    .click();
                cy.get('#product-target').should('exist');
                cy.get('[data-test=wishlist-toggle]').should('contain.text', SAVED);

                cy.step('the wishlist page lists it beside the two already saved');
                cy.navigateViaMenu('account', '/en/wishlist');
                cy.get('[data-test=wishlist-item]').should('have.length', 3);
                cy.contains('[data-test=wishlist-item]', bottle.title).should('exist');

                cy.step('removes it, then the rest; the empty state leads back to the catalogue');
                cy.contains('[data-test=wishlist-item]', bottle.title)
                    .find('[data-test=wishlist-remove]')
                    .click();
                cy.get('[data-test=wishlist-item]').should('have.length', 2);
                cy.get('[data-test=wishlist-item] [data-test=wishlist-remove]').first().click();
                cy.get('[data-test=wishlist-item]').should('have.length', 1);
                cy.get('[data-test=wishlist-item] [data-test=wishlist-remove]').first().click();
                cy.get('[data-test=wishlist-item]').should('not.exist');
                cy.contains('Nothing saved yet').should('be.visible');
                cy.apiAs<WishlistBody>('user', 'GET', '/wishlist').should((wishlist) => {
                    expect(wishlist?.items, 'the list is empty on the server too').to.have.length(
                        0
                    );
                });
                cy.contains('Browse products').click();
                cy.get('#products-list-page').should('exist');

                cy.step('puts the food in the cart, then saves it and the bottle from their cards');
                searchAndOpenProduct('product.rich');
                addOpenProductToCart();
                cy.navigateTo('/en/products');
                for (const title of [food.title, bottle.title]) {
                    searchProducts(title);
                    cy.contains('[data-test=product-card]', title)
                        .find('[data-test=wishlist-toggle]')
                        .click();
                    cy.wait('@save').its('response.statusCode').should('eq', 200);
                }

                cy.step('moves the food to the cart, where it already is: it adds on top');
                cy.navigateViaMenu('account', '/en/wishlist');
                cy.get('[data-test=wishlist-item]').should('have.length', 2);
                cy.contains('[data-test=wishlist-item]', food.title)
                    .find('[data-test=wishlist-move-to-cart]')
                    .click();
                cy.get('[data-test=wishlist-item]').should('have.length', 1);
                cy.contains('[data-test=wishlist-item]', bottle.title).should('exist');
                cy.apiAs<{ items: { productId: string; quantity: number }[] }>(
                    'user',
                    'GET',
                    '/cart'
                ).should((cart) => {
                    const line = cart?.items.find((item) => item.productId === food.id);
                    expect(line?.quantity, 'the moved unit joined the one already there').to.equal(
                        2
                    );
                });
            });
        });
    });
});
