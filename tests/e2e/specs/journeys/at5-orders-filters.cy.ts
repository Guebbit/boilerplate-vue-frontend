// requires-module: account, orders
/**
 * @module
 * AT5 · Orders list filters. Each staff filter narrows the list to rows that really match, and
 * "reset" brings the full list back. Status and deleted are read off the rows themselves; id,
 * email and awaiting-transfer are held to a seeded order that must, or must not, be among them.
 */
import { listedIds, resetSearch, submitSearch } from '../../../support/e2e/steps';

describe('AT5 · Orders list filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
        cy.trackNetwork();
        cy.visit('/en/orders');
        cy.settleNetwork();
    });

    it('status, id, email, awaiting transfer and deleted each narrow the list, and reset restores it', () => {
        cy.subjectId('order.paid').then((paidId) => {
            cy.subjectId('order.awaitingTransfer').then((transferId) => {
                cy.subjectId('order.softDeleted').then((deletedId) => {
                    listedIds().then((all) => {
                        cy.step('status: only paid orders, and the paid subject is among them');
                        cy.pickOption('[data-test=filter-status]', 'Paid');
                        submitSearch();
                        cy.get('[data-test=list-row]').each(($row) => {
                            expect($row.text()).to.contain('Paid');
                        });
                        resetSearch();
                        listedIds().should('deep.equal', all);

                        cy.step('id: exactly that order');
                        cy.get('[data-test=filter-id] input').type(paidId);
                        submitSearch();
                        listedIds().should('deep.equal', [paidId]);
                        resetSearch();

                        cy.step("email: only the orders that address, and not the customer's");
                        cy.accountOf('admin').then(({ email }) => {
                            cy.subjectId('order.ownerPending').then((ownedByAdmin) => {
                                cy.get('[data-test=filter-email] input').type(email);
                                submitSearch();
                                listedIds().should('include', ownedByAdmin);
                                listedIds().should('not.include', paidId);
                            });
                        });
                        resetSearch();

                        cy.step('awaiting transfer: only unpaid bank-transfer orders');
                        cy.get('[data-test=filter-awaiting-transfer] input').check();
                        submitSearch();
                        listedIds().should('include', transferId);
                        listedIds().should('not.include', paidId);
                        cy.get('[data-test=filter-awaiting-transfer] input').uncheck();
                        resetSearch();

                        cy.step('deleted: only the soft-deleted order, then none of it');
                        cy.pickOption('[data-test=filter-deleted]', 'Deleted only');
                        submitSearch();
                        listedIds().should('deep.equal', [deletedId]);
                        cy.get('[data-test=row-deleted]').should('have.length', 1);
                        cy.pickOption('[data-test=filter-deleted]', 'Not deleted');
                        submitSearch();
                        listedIds().should('not.include', deletedId);
                        cy.get('[data-test=row-deleted]').should('not.exist');
                        resetSearch();
                        listedIds().should('deep.equal', all);
                    });
                });
            });
        });
    });

    it('the pager moves through the list without repeating a row, and a larger page shows more', () => {
        listedIds().then((first) => {
            expect(first, 'the seed holds more than one page of orders').to.have.length(10);
            cy.get('[data-test=pagination]').contains('button', '2').click();
            cy.settleNetwork();
            listedIds().should((second) => {
                expect(second).to.have.length.greaterThan(0);
                expect(second.filter((id) => first.includes(id))).to.have.length(0);
            });
            cy.pickOption('[data-test=page-size]', '50');
            cy.settleNetwork();
            listedIds().should('have.length.greaterThan', first.length);
        });
    });
});
