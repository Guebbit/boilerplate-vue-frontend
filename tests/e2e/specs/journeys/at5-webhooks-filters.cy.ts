// requires-module: webhooks
/**
 * @module
 * AT5 · Webhooks list filter. One enabled and one disabled subscription are made for the story;
 * the "Status" filter shows only the matching ones, and reset shows both again.
 */
import { listedIds, resetSearch, submitSearch } from '../../../support/e2e/steps';

describe('AT5 · Webhooks list filter', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('enabled and disabled each show only their own subscriptions, and reset shows both', () => {
        cy.createWebhookSubscription({ url: 'https://example.com/hook-at5-on' }).then((on) => {
            cy.createWebhookSubscription({ url: 'https://example.com/hook-at5-off' }).then(
                (off) => {
                    cy.apiAs('admin', 'PATCH', `/webhooks/subscriptions/${off.id}`, {
                        enabled: false
                    });

                    cy.loginAs('admin');
                    cy.trackNetwork();
                    cy.visit('/en/webhooks/subscriptions');
                    cy.settleNetwork();
                    cy.get('[data-test=row-view]').should('have.length.gte', 2);
                    listedIds().then((all) => {
                        expect(all).to.include.members([on.id, off.id]);

                        cy.step('enabled: the disabled one drops out');
                        cy.pickOption('[data-test=filter-enabled]', 'Enabled');
                        submitSearch();
                        listedIds().should('include', on.id);
                        listedIds().should('not.include', off.id);

                        cy.step('disabled: the enabled one drops out, and the seeded one with it');
                        cy.pickOption('[data-test=filter-enabled]', 'Disabled');
                        submitSearch();
                        listedIds().should('deep.equal', [off.id]);

                        cy.step('reset: everything is back');
                        resetSearch();
                        listedIds().should('deep.equal', all);
                    });
                }
            );
        });
    });
});
