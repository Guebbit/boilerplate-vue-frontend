// requires-module: account, products
/**
 * @module
 * AT5 · Products list filters (staff). Active, deleted, id and the price range each narrow the
 * list to rows that match, and "reset" restores it. The seeded inactive and soft-deleted products
 * are the witnesses: each must appear under its own filter and vanish under the opposite one.
 */
import { listedIds, resetSearch, submitSearch } from '../../../support/e2e/steps';

describe('AT5 · Products list filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
        cy.trackNetwork();
        cy.visit('/en/products');
        cy.settleNetwork();
    });

    it('active, deleted, id and price range narrow the list, and reset restores it', () => {
        cy.subjectId('product.inactive').then((inactiveId) => {
            cy.subjectId('product.softDeleted').then((deletedId) => {
                cy.subjectId('product.rich').then((richId) => {
                    listedIds().then((all) => {
                        cy.step(
                            'inactive only: the inactive product is there, the rich one is not'
                        );
                        cy.pickOption('[data-test=filter-active]', 'Inactive');
                        submitSearch();
                        listedIds().should('include', inactiveId);
                        listedIds().should('not.include', richId);
                        cy.pickOption('[data-test=filter-active]', 'Active');
                        submitSearch();
                        listedIds().should('not.include', inactiveId);
                        resetSearch();
                        listedIds().should('deep.equal', all);

                        cy.step(
                            'deleted only: the soft-deleted product, flagged, and nothing live'
                        );
                        cy.pickOption('[data-test=filter-deleted]', 'Deleted only');
                        submitSearch();
                        listedIds().should('include', deletedId);
                        listedIds().should('not.include', richId);
                        cy.pickOption('[data-test=filter-deleted]', 'Not deleted');
                        submitSearch();
                        listedIds().should('not.include', deletedId);
                        cy.get('[data-test=row-deleted]').should('not.exist');
                        resetSearch();

                        cy.step('id: exactly that product');
                        cy.get('[data-test=filter-id] input').type(richId);
                        submitSearch();
                        listedIds().should('deep.equal', [richId]);
                        resetSearch();

                        cy.step('price range: a product priced otherwise drops out');
                        cy.subjectProduct('product.rich').then((rich) => {
                            cy.subjectProduct('product.inStock').then((other) => {
                                expect(other.price, 'a witness priced differently').to.not.equal(
                                    rich.price
                                );
                                cy.get('[data-test=filter-min-price] input').type(
                                    String(rich.price)
                                );
                                cy.get('[data-test=filter-max-price] input').type(
                                    String(rich.price)
                                );
                                submitSearch();
                                listedIds().should('include', richId);
                                cy.subjectId('product.inStock').then((otherId) => {
                                    listedIds().should('not.include', otherId);
                                });
                                resetSearch();
                                listedIds().should('deep.equal', all);
                            });
                        });
                    });
                });
            });
        });
    });
});
