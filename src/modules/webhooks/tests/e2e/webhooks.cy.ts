/**
 * @module
 * Cypress end-to-end spec driving the real app: list, create, edit and delete for the admin-only
 * webhook subscriptions module. FA123: only an a11y sweep existed here before this — no
 * functional coverage of create/edit/delete/list behavior at all.
 */

/** A value unique enough per run that two specs racing the same backend cannot collide. */
const unique = () =>
    `https://example.com/e2e-hook-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
            const url = unique();

            cy.visit('/en/webhooks/subscriptions/create');
            cy.get('[data-test=webhook-url] input').type(url);
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
            cy.contains(url).should('exist');
        });
    });

    describe('Edit', () => {
        it('edits a subscription through the real form and the change survives a reload', () => {
            const originalUrl = unique();
            const editedDescription = `edited-${unique()}`;

            cy.createWebhookSubscription({ url: originalUrl, eventTypes: ['order.created'] }).then(
                (subscription) => {
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
                }
            );
        });
    });

    describe('Delete', () => {
        it('deletes a subscription after confirming, and it drops out of the list', () => {
            const url = unique();

            cy.createWebhookSubscription({ url, eventTypes: ['order.created'] }).then(() => {
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
