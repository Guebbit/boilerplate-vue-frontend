// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * PS3 · The preorder board, from allowance to allocation. The warehouse sets how many of a
 * preorder product the shop will take (Cancel writes nothing; a negative number is held at zero),
 * a customer preorders twice and pays, and the admin finds both on the board: the outstanding count, the
 * orders behind it, each card saying "awaiting stock" with no way to mark it shipped. When stock
 * arrives the receipt allocates it to both, the board's count falls to nothing, and the warehouse
 * can ship one.
 */
import { paidPreorderBy, preorderOnSale, shipThroughTheApi } from '../../../support/e2e/steps';

/** The slice of a stock level this story reads. */
interface LevelLike {
    productId: string;
    preorderLimit: number;
}

/**
 * A product's preorder allowance, read from the stock levels the admin API serves.
 *
 * @param productId - the product
 */
const limitOf = (productId: string): Cypress.Chainable<number | undefined> =>
    cy
        .apiAs<{ items: LevelLike[] }>('admin', 'GET', '/inventory/levels?pageSize=100')
        .then((page) =>
            cy.wrap(page?.items.find((level) => level.productId === productId)?.preorderLimit, {
                log: false
            })
        );

describe('PS3 · The preorder board, from allowance to allocation', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('takes an allowance, shows two waiting orders, and allocates a receipt to both', () => {
        const title = `PS3 preorder ${String(Date.now())}`;
        preorderOnSale({ releaseInDays: 30, limit: 1, title }).then((productId) => {
            cy.step('the warehouse opens the allowance dialog: Cancel writes nothing');
            cy.loginAs('warehouse');
            cy.visit('/en/inventory');
            cy.contains('[data-test=level-row]', title)
                .find('[data-test=level-preorder-limit]')
                .click();
            cy.get('[data-test=preorder-limit-cancel]').click();
            cy.get('[data-test=preorder-limit-dialog]').should('not.exist');
            limitOf(productId).should('equal', 1);

            cy.step(
                'a negative number is held at zero by the field, and Cancel still writes nothing'
            );
            cy.contains('[data-test=level-row]', title)
                .find('[data-test=level-preorder-limit]')
                .click();
            cy.get('[data-test=preorder-limit-field] input').clear();
            cy.get('[data-test=preorder-limit-field] input').type('-1');
            cy.get('[data-test=preorder-limit-field] input').blur();
            cy.get('[data-test=preorder-limit-field] input').should('have.value', '0');
            cy.get('[data-test=preorder-limit-cancel]').click();
            cy.get('[data-test=preorder-limit-dialog]').should('not.exist');
            limitOf(productId).should('equal', 1);

            cy.step('two is saved');
            cy.contains('[data-test=level-row]', title)
                .find('[data-test=level-preorder-limit]')
                .click();
            cy.get('[data-test=preorder-limit-field] input').clear();
            cy.get('[data-test=preorder-limit-field] input').type('2');
            cy.get('[data-test=preorder-limit-submit]').click();
            cy.get('[data-test=preorder-limit-dialog]').should('not.exist');
            limitOf(productId).should('equal', 2);

            cy.step('the customer preorders twice and pays both');
            paidPreorderBy(productId).as('first');
            paidPreorderBy(productId).as('second');

            cy.step('the admin finds two outstanding on the board, and the orders behind it');
            cy.switchUser('admin');
            cy.visit('/en/sales/preorders');
            cy.contains('[data-test=preorder-products] tr', title)
                .find('[data-test=preorder-outstanding]')
                .should('have.text', '2');
            cy.contains('[data-test=preorder-products] tr', title)
                .find('[data-test=preorder-show-orders]')
                .click();
            cy.get('[data-test=preorder-orders]').should('be.visible');
            cy.get('[data-test=preorder-order-link]').should('have.length', 2);
            cy.get('[data-test=preorder-state]').each(($state) => {
                expect($state.text().toLowerCase()).to.contain('waiting for stock');
            });

            cy.step('one order’s card says awaiting stock and offers no shipped state');
            cy.get<string>('@first').then((orderId) => {
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=fulfillment-order-awaiting-stock]').should('exist');
                cy.get('[data-test=open-ship]').should('not.exist');
                cy.visit(`/en/orders/${orderId}/edit`);
                cy.get('[data-test=override-status-select]').click();
                cy.get('[role=listbox] [role=option]').then(($options) => {
                    const labels = $options.toArray().map((option) => option.textContent ?? '');
                    expect(labels.join('|')).to.not.match(/shipped|delivered/i);
                });
                cy.get('body').type('{esc}');
            });

            cy.step('the warehouse receives two units: both orders are allocated');
            cy.apiAs('warehouse', 'POST', '/inventory/receipts', { productId, quantity: 2 });
            cy.visit('/en/sales/preorders');
            cy.contains('[data-test=preorder-products] tr', title)
                .find('[data-test=preorder-outstanding]')
                .should('have.text', '0');
            cy.visit('/en/inventory');
            cy.get('[data-test=movements-filter-product] input').clear();
            cy.get('[data-test=movements-filter-product] input').type(title);
            cy.get('[role=listbox] [role=option]').contains(title).click();
            cy.get('[data-test=movement-reason]').should(($reasons) => {
                const oldestFirst = $reasons
                    .toArray()
                    .map((reason) => reason.textContent?.trim())
                    .toReversed();
                expect(oldestFirst).to.include('Received');
                expect(oldestFirst.filter((reason) => reason === 'Allocated')).to.have.length(2);
            });
            cy.get<string>('@first').then((orderId) => {
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=fulfillment-order-awaiting-stock]').should('not.exist');
                cy.get('[data-test=open-ship]').should('exist');
            });

            cy.step('shipping one takes its unit off the shelf');
            cy.get<string>('@first').then((orderId) => {
                shipThroughTheApi(orderId);
            });
            cy.visit('/en/inventory');
            cy.get('[data-test=movements-filter-product] input').clear();
            cy.get('[data-test=movements-filter-product] input').type(title);
            cy.get('[role=listbox] [role=option]').contains(title).click();
            cy.get('[data-test=movement-reason]').first().should('have.text', 'Shipped');
        });
    });
});
