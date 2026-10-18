// requires-module: account, orders
/**
 * @module
 * OP37 · The manager exports what the filter shows. The manager filters the orders list to the paid
 * ones and presses Export: the file the browser saves is, byte for byte, the answer the server
 * gave, it holds one line per listed order plus the header, and every order number on the screen
 * is in it. Nothing parses the CSV: equality and substring checks need no parser.
 */
import { downloadedText, listedIds, submitSearch } from '../../../support/e2e/steps';

describe('OP37 · The manager exports what the filter shows', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('manager');
        cy.visit('/en/sales/orders');
    });

    it('saves the server’s CSV, one line per listed order', () => {
        cy.step('the manager filters to the paid orders');
        cy.pickOption('[data-test=filter-status]', 'Paid');
        submitSearch();
        cy.get('[data-test=list-row]').should('have.length.greaterThan', 0);
        listedIds().then((ids) => {
            cy.step('Export saves a file that is the server’s answer');
            cy.intercept('GET', '**/orders/export*').as('exportOrders');
            cy.get('[data-test=orders-export]').click();
            cy.wait('@exportOrders').then(({ response }) => {
                expect(response?.statusCode).to.equal(200);
                // The server leads with a byte-order mark so a spreadsheet reads UTF-8; readFile drops it.
                const served = String(response?.body).replace(/^\uFEFF/, '');
                // The file name carries the browser's UTC day, as the page names it.
                downloadedText(`orders-${new Date().toISOString().slice(0, 10)}.csv`).then(
                    (saved) => {
                        expect(saved, 'the saved file equals the served body').to.equal(served);

                        cy.step('one line per listed order, plus the header');
                        cy.apiAs<{ items: unknown[] }>(
                            'manager',
                            'GET',
                            '/orders?status=paid&pageSize=100'
                        )
                            .its('items.length')
                            .should('equal', saved.trim().split('\n').length - 1);

                        cy.step('every order number on the screen is in the file');
                        cy.get('[data-test=row-order-number]').each(($number) => {
                            expect(saved).to.contain($number.text().trim());
                        });
                        expect(ids.length).to.be.greaterThan(0);
                    }
                );
            });
        });
    });
});
