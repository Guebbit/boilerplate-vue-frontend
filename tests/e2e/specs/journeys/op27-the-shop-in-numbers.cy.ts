// requires-module: account, cart, orders, payments, products, stats
/**
 * @module
 * OP27 · The shop in numbers. A product nobody bought shows "sold nothing"; once a shopper buys two
 * units and the cash is recorded, the manager’s dashboard lists the product with two units ordered,
 * the product’s own page opens from it, "View orders" lands on exactly that order, and an old
 * period shows nothing sold. The manager reads all of this: stats are theirs.
 *
 * Numbers for the journey’s own product are exact on every profile; other specs sell too, so
 * nothing shop-wide is compared exactly.
 */
import { checkoutAs } from '../../../support/e2e/steps';

describe('OP27 · The shop in numbers', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('moves the product’s row with a sale and leads from it to the order', () => {
        const title = `OP27 stats ${String(Date.now())}`;
        // Priced high enough to sit in the dashboard's top ten whatever else the seed sold.
        cy.createProduct({ title, onHand: 10, price: 5000 }).then((product) => {
            cy.step('a product nobody bought says it sold nothing');
            cy.loginAs('manager');
            cy.visit(`/en/sales/stats/products/${product.id}`);
            cy.get('[data-test=sold-nothing]').should('exist');

            cy.step('a shopper buys two units and the cash is recorded');
            cy.apiAs('user', 'POST', '/cart', { productId: product.id, quantity: 2 });
            cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
            checkoutAs<{ id: string }>('user').then((order) => {
                const orderId = String(order?.id);
                cy.apiAs('admin', 'POST', `/payments/order/${orderId}/offline`, {
                    method: 'cash'
                });

                cy.step('the dashboard lists the product with two units ordered');
                cy.visit('/en/sales/stats');
                cy.contains('[data-test=products-table] tr', title)
                    .find('td')
                    .first()
                    .should('have.text', '2');

                cy.step('the product’s own page no longer says it sold nothing');
                cy.contains('[data-test=products-table] tr', title)
                    .find('[data-test=product-link]')
                    .click();
                cy.get('[data-test=product-title]').should('contain.text', title);
                cy.get('[data-test=sold-nothing]').should('not.exist');

                cy.step('"View orders" lands on exactly that order');
                cy.get('[data-test=view-orders]').click();
                cy.get('[data-test=filter-product-id] input').should('have.value', product.id);
                cy.get('[data-test=list-row]').should('have.length', 1);
                cy.get(`[data-test=row-view]`).first().click();
                cy.url().should('include', orderId);
            });

            cy.step('a period long before the shop opened shows nothing sold');
            cy.visit('/en/sales/stats');
            const farBack = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
            const stillBack = new Date(Date.now() - 370 * 86_400_000).toISOString().slice(0, 10);
            cy.get('[data-test=stats-from] input').clear();
            cy.get('[data-test=stats-from] input').type(farBack);
            cy.get('[data-test=stats-to] input').clear();
            cy.get('[data-test=stats-to] input').type(stillBack);
            cy.get('[data-test=stats-apply]').click();
            cy.get('[data-test=card-orders]').should('contain.text', '0');
            cy.get('[data-test=products-empty]').should('exist');
        });
    });
});
