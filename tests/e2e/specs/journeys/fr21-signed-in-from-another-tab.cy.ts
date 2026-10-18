// requires-module: account, cart, products
/**
 * @module
 * FR21 · I signed in from another tab. A guest with a line in the browser's cart has a second tab
 * sign in as a customer. This tab learns of it without a reload: the bar shows the customer, and
 * the guest line is merged into their cart exactly once. A tab that was acting as one customer
 * when a second tab signs in as another becomes the second customer, never a mix of the two.
 *
 * The second tab is played by the test: a real login whose cookies land in the browser's own jar,
 * then the `login` message another tab posts on the `session` channel.
 */
import { otherTab } from '../../../support/e2e/harness';

/** The slice of `GET /cart` the story reads. */
interface CartLines {
    items: { productId: string; quantity: number }[];
}

describe('FR21 · I signed in from another tab', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        // A customer's own cart may hold lines already; start empty so a line is only there
        // because this story put it there.
        cy.apiAs('user', 'DELETE', '/cart/all');
    });

    it('this tab becomes the customer and the guest line is merged once', () => {
        cy.subjectProduct('product.inStock').then((product) => {
            cy.step('a guest adds a product to the cart kept in this browser');
            cy.visit(`/en/products/${product.id}`);
            cy.get('[data-test=add-to-cart]').click();
            cy.get('[data-test=nav-login-link]').should('exist');

            cy.step('another tab signs in as the customer; this one follows without a reload');
            otherTab.signIn('user');
            cy.get('[data-test=user-menu]').should('exist');
            cy.get('[data-test=nav-login-link]').should('not.exist');

            cy.step('the guest line reached the customer cart exactly once');
            cy.apiAs<CartLines>('user', 'GET', '/cart').should((cart) => {
                const lines = (cart?.items ?? []).filter((line) => line.productId === product.id);
                expect(lines, 'lines of the product').to.have.length(1);
                expect(lines[0]?.quantity, 'quantity').to.equal(1);
            });
        });
    });

    it('a tab that was one customer becomes the other, never a mix', () => {
        cy.step('this tab is signed in as the first customer');
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get('[data-test=user-menu]').should('exist');

        cy.step('another tab signs in as the second customer');
        cy.accountOf('secondShopper').then(({ email }) => {
            otherTab.signIn('secondShopper');
            cy.step('this tab now acts as the second customer');
            cy.apiAs<{ email: string }>('secondShopper', 'GET', '/account')
                .its('email')
                .should('equal', email);
            cy.get('[data-test=user-menu]').click();
            cy.get('[role=menu]').should('contain.text', email);
        });
    });
});
