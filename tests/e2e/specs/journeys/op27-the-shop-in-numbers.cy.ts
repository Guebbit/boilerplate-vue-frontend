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
import { checkoutAs, downloadedText } from '../../../support/e2e/steps';

/**
 * The money a stats card shows, as a number: the first amount with cents in the card's text.
 *
 * @param text - the card's text: title, formatted value, change line
 * @returns the amount in major units
 */
const moneyOf = (text: string): number => {
    const amount = /(-?[\d,]+\.\d{2})/.exec(text)?.[1];
    if (amount === undefined) throw new Error(`no amount in the card: ${text}`);
    return Number(amount.replaceAll(',', ''));
};

/**
 * Types a period into the dashboard form and applies it.
 *
 * @param from - first day, `YYYY-MM-DD`
 * @param to - last day, `YYYY-MM-DD`
 */
const applyPeriod = (from: string, to: string) => {
    cy.get('[data-test=stats-from] input').clear();
    cy.get('[data-test=stats-from] input').type(from);
    cy.get('[data-test=stats-to] input').clear();
    cy.get('[data-test=stats-to] input').type(to);
    cy.get('[data-test=stats-apply]').click();
};

/**
 * Regroups the revenue table by a bucket size and counts its rows.
 *
 * @param interval - the size to pick: `Day`, `Week` or `Month`
 * @returns a chain yielding the number of rows the table then shows
 */
const rowsFor = (interval: string): Cypress.Chainable<number> => {
    cy.pickOption('[data-test=stats-interval]', interval);
    cy.get('[data-test=stats-apply]').click();
    return cy.get('[data-test=revenue-table] tbody tr').its('length');
};

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

    it('shows a refund in the numbers, saves the revenue as a CSV and regroups by week and month', () => {
        cy.step('the refunds card before anything is refunded');
        cy.loginAs('manager');
        cy.visit('/en/sales/stats');
        cy.get('[data-test=card-refunds]')
            .invoke('text')
            .then((text) => {
                const before = moneyOf(text);

                cy.step('a shopper buys, the cash is recorded and the admin refunds all of it');
                const title = `OP27 refund ${String(Date.now())}`;
                cy.createProduct({ title, onHand: 10, price: 5000 }).then((product) => {
                    cy.apiAs('user', 'POST', '/cart', { productId: product.id, quantity: 2 });
                    cy.apiAs('user', 'PUT', '/cart/shipping-method', {
                        shippingMethodId: 'pickup'
                    });
                    checkoutAs<{ id: string }>('user').then((order) => {
                        const orderId = String(order?.id);
                        cy.apiAs('admin', 'POST', `/payments/order/${orderId}/offline`, {
                            method: 'cash'
                        });
                        cy.apiAs<{ amount: number }>(
                            'admin',
                            'GET',
                            `/payments/order/${orderId}`
                        ).then((payment) => {
                            const total = Number(payment?.amount);
                            cy.switchUser('admin');
                            cy.visit(`/en/orders/${orderId}/edit`);
                            cy.get('[data-test=refund-amount] input').clear();
                            cy.get('[data-test=refund-amount] input').type(total.toFixed(2));
                            cy.get('[data-test=button-refund-only]').click();
                            cy.contains('Payment refunded. The order status is unchanged.').should(
                                'exist'
                            );

                            cy.step('the refunds card grows by the refunded amount');
                            cy.switchUser('manager');
                            cy.visit('/en/sales/stats');
                            // Other live specs refund too: exact on the demo, "at least" on live.
                            cy.get('[data-test=card-refunds]')
                                .invoke('text')
                                .should((after) => {
                                    expect(moneyOf(after) - before).to.be.at.least(total);
                                });
                        });
                    });
                });
            });

        cy.step('the revenue CSV holds the same rows as the table, under the same titles');
        cy.get('[data-test=revenue-csv]').click();
        cy.get('[data-test=revenue-table] tbody tr').then((rows) => {
            downloadedText('revenue-EUR.csv').then((csv) => {
                const lines = csv.trim().split(/\r?\n/);
                expect(lines[0]).to.equal('Period,Orders,Gross,Reversals,Net,Taxes,Shipping,Total');
                expect(lines.length - 1, 'one CSV line per table row').to.equal(rows.length);
            });
        });

        cy.step('day, week and month group the same range into fewer and fewer rows');
        rowsFor('Day').then((days) => {
            rowsFor('Week').then((weeks) => {
                expect(weeks, 'weeks are fewer than days').to.be.lessThan(days);
                rowsFor('Month').then((months) => {
                    expect(months, 'months are fewer than weeks').to.be.lessThan(weeks);
                });
            });
        });

        cy.step('a period before the shop opened shows no sales, and the products block says so');
        const farBack = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
        const stillBack = new Date(Date.now() - 370 * 86_400_000).toISOString().slice(0, 10);
        applyPeriod(farBack, stillBack);
        cy.get('[data-test=card-orders]').should('contain.text', '0');
        // The sales and operations blocks keep their zeroed cards; their empty copy is for an
        // answer with no currency at all, which the stats action rows serve.
        cy.get('[data-test=products-empty]').should('exist');
    });
});
