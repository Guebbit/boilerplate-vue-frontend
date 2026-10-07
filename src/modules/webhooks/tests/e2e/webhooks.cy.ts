/**
 * @module
 * Cypress end-to-end spec driving the real app: list, create, edit and delete for the admin-only
 * webhook subscriptions module. The a11y sweep is its own spec (`a11y.cy.ts`); this one is the
 * functional coverage of create, edit, delete and list.
 */

import { sinkEndpoint } from '../../../../../tests/support/e2e/integrator';

/**
 * A path unique enough per run that two specs racing the same backend cannot collide. Resolved
 * onto the seeded sink's origin by `sinkEndpoint`; free of the word 'dead', which the sink 503s.
 */
const unique = () => `/e2e-hook-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

describe('Webhook subscriptions', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
    });

    describe('List', () => {
        beforeEach(() => {
            cy.visit('/en/webhooks/subscriptions');
        });

        it('shows the page title', () => {
            cy.get('#webhooks-list-page').should('exist');
            cy.get('h1').should('contain.text', 'Webhook subscriptions');
        });
    });

    describe('Create', () => {
        it('creates a subscription through the real form and lands on its detail page', () => {
            cy.visit('/en/webhooks/subscriptions/create');
            sinkEndpoint(unique()).then((url) => {
                cy.get('[data-test=webhook-url] input').type(url);
                cy.wrap(url, { log: false }).as('createdUrl');
            });
            cy.get('[data-test=webhook-description] input').type('e2e coverage');
            cy.pickOption('[data-test=webhook-event-types]', 'order.created');
            // The multi-select stays open after one pick; close it before the submit below.
            cy.get('body').type('{esc}');
            cy.get('form').submit();

            // The signing secret is shown exactly once, in a modal.
            cy.get('[data-test=secret-reveal]').should('be.visible');
            cy.get('[data-test=secret-reveal-confirm-saved] input').click();
            cy.get('[data-test=secret-reveal-continue]').click();

            cy.url().should('include', '/webhooks/subscriptions/').and('not.include', '/create');
            cy.contains('Subscription created').should('exist');
            cy.get<string>('@createdUrl').then((url) => cy.contains(url).should('exist'));
        });
    });

    describe('Edit', () => {
        it('edits a subscription through the real form and the change survives a reload', () => {
            const editedDescription = `edited-${unique()}`;

            sinkEndpoint(unique())
                .then((originalUrl) =>
                    cy.createWebhookSubscription({
                        url: originalUrl,
                        eventTypes: ['order.created']
                    })
                )
                .then((subscription) => {
                    cy.visit(`/en/webhooks/subscriptions/${subscription.id}/edit`);
                    cy.get('[data-test=webhook-description] input').clear();
                    cy.get('[data-test=webhook-description] input').type(editedDescription);
                    cy.get('form').submit();
                    cy.contains('Subscription updated').should('exist');

                    cy.reload();
                    cy.get('[data-test=webhook-description] input').should(
                        'have.value',
                        editedDescription
                    );
                });
        });
    });

    describe('Delete', () => {
        it('deletes a subscription after confirming, and it drops out of the list', () => {
            sinkEndpoint(unique()).then((url) => {
                cy.createWebhookSubscription({ url, eventTypes: ['order.created'] });
                cy.visit('/en/webhooks/subscriptions');
                cy.pickOption('[data-test=page-size]', '50');

                cy.contains('[data-test=list-row]', url).within(() => {
                    cy.get('[data-test=row-delete]').click();
                });
                cy.get('[data-test=app-dialog-confirm]').click();
                cy.contains('Subscription deleted').should('exist');
                cy.contains('[data-test=list-row]', url).should('not.exist');
            });
        });
    });
});
