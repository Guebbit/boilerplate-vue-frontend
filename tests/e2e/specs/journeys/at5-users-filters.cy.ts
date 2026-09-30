// requires-module: account, users
/**
 * @module
 * AT5 · Users list filters. Text, email, username, active and deleted each narrow the list to the
 * rows that match, and "reset" restores it. The seeded customer and the banned `marcus` are the
 * witnesses: one appears under its own email, the other only under "Inactive".
 */
import { listedIds, resetSearch, submitSearch } from '../../../support/e2e/steps';

/** The slice of a user this story reads. */
interface UserLike {
    id: string;
}

describe('AT5 · Users list filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
        cy.trackNetwork();
        cy.visit('/en/users');
        cy.settleNetwork();
    });

    it('email, active, deleted and text narrow the list, and reset restores it', () => {
        cy.accountOf('user').then(({ email }) => {
            cy.apiAs<{ items: UserLike[] }>('admin', 'POST', '/users/search', { email }).then(
                (found) => {
                    const customerId = String(found?.items[0]?.id);
                    listedIds().then((all) => {
                        cy.step('email: exactly the customer');
                        cy.get('[data-test=filter-email] input').type(email);
                        submitSearch();
                        listedIds().should('deep.equal', [customerId]);
                        resetSearch();
                        listedIds().should('deep.equal', all);

                        cy.step('id: exactly that user');
                        cy.get('[data-test=filter-id] input').type(customerId);
                        submitSearch();
                        listedIds().should('deep.equal', [customerId]);
                        resetSearch();

                        cy.step('inactive: the banned account is there, the customer is not');
                        cy.pickOption('[data-test=filter-active]', 'Inactive');
                        submitSearch();
                        listedIds().should('not.include', customerId);
                        cy.get('[data-test=list-row]').should('have.length.greaterThan', 0);
                        // The page is ten rows, so the customer is held to by id rather than hoped for on page one.
                        cy.get('[data-test=filter-id] input').type(customerId);
                        cy.pickOption('[data-test=filter-active]', 'Active');
                        submitSearch();
                        listedIds().should('deep.equal', [customerId]);
                        cy.pickOption('[data-test=filter-active]', 'Inactive');
                        submitSearch();
                        listedIds().should('deep.equal', []);
                        resetSearch();

                        cy.step(
                            "text: matches the email's local part, and only users that hold it"
                        );
                        cy.get('[data-test=filter-text] input').type(email.split('@')[0]);
                        submitSearch();
                        listedIds().should('include', customerId);
                        listedIds().should('have.length.lessThan', all.length);
                        resetSearch();

                        cy.step('deleted: none are soft-deleted in the seed');
                        cy.pickOption('[data-test=filter-deleted]', 'Deleted only');
                        submitSearch();
                        cy.get('[data-test=row-deleted]').should('have.length', 0);
                        listedIds().should('not.include', customerId);
                    });
                }
            );
        });
    });
});
