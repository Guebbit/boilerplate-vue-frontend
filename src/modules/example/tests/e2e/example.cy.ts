/**
 * @module
 * Cypress end-to-end spec driving the real app: the example module's whole loop. A customer writes
 * a note, publishes it, and a stranger reads it; the lists narrow to who is asking. The backend's
 * demo scenario seeds the customer three examples (one per status) and the admin one published
 * example, so each list starts with something in it.
 */

/** A value unique enough per run that two specs racing the same backend cannot collide. */
const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

describe('Example', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('Who sees what', () => {
        it('shows a customer their own examples and nobody else’s', () => {
            cy.loginAs('user');
            cy.visit('/en/examples');

            cy.get('#examples-list-page').should('exist');
            cy.contains('[data-test=list-row]', 'Training a puppy to sit').should('exist');
            cy.contains('[data-test=list-row]', 'Welcome to the example module').should(
                'not.exist'
            );
        });

        it('shows an administrator everyone’s', () => {
            cy.loginAs('admin');
            cy.visit('/en/examples');

            cy.contains('[data-test=list-row]', 'Welcome to the example module').should('exist');
            cy.contains('[data-test=list-row]', 'Training a puppy to sit').should('exist');
        });

        it('narrows the list by status', () => {
            cy.loginAs('user');
            cy.visit('/en/examples');

            cy.pickOption('[data-test=filter-status]', 'Archived');
            cy.contains('[data-test=list-row]', 'A winter coat checklist').should('exist');
            cy.contains('[data-test=list-row]', 'Training a puppy to sit').should('not.exist');
        });
    });

    describe('Write, publish, read', () => {
        it('creates a draft, publishes it, and lets a stranger read it', () => {
            const title = `e2e-note-${unique()}`;

            cy.loginAs('user');
            cy.visit('/en/examples/create');
            cy.get('[data-test=example-title] input').type(title);
            cy.get('[data-test=example-body] textarea').type('Written through the real form.');
            cy.get('form button[type=submit]').click();

            // The new example opens as a draft, and publishing is one click away.
            cy.get('#example-target').should('exist');
            cy.get('[data-test=example-target-status]').should('contain.text', 'Draft');
            cy.get('[data-test=example-move-published]').click();
            cy.get('[data-test=example-target-status]').should('contain.text', 'Published');

            cy.location('pathname').then((pathname) => {
                const id = pathname.split('/').at(-1);

                // A stranger: the session is gone, and the public page still answers.
                cy.logout();
                cy.visit(`/en/examples/published/${id}`);
                cy.get('[data-test=example-published-body]').should(
                    'contain.text',
                    'Written through the real form.'
                );
            });
        });

        it('keeps a draft away from the public page', () => {
            cy.loginAs('user');
            // The customer’s seeded draft: readable by its owner, a 404 for everyone else.
            cy.visit('/en/examples/published/65e1a0000000000000000e02');

            cy.get('#example-published-page').should('not.exist');
            cy.url().should('include', '/error/');
        });
    });

    describe('Edit and delete', () => {
        it('changes a title through the edit form', () => {
            const title = `e2e-renamed-${unique()}`;

            cy.loginAs('user');
            cy.visit('/en/examples/65e1a0000000000000000e02/edit');
            cy.get('[data-test=example-title] input').should('not.have.value', '').clear();
            cy.get('[data-test=example-title] input').type(title);
            cy.get('[data-test=example-submit]').click();

            cy.contains('Example updated').should('exist');
            cy.visit('/en/examples');
            cy.contains('[data-test=list-row]', title).should('exist');
        });

        it('deletes an example after a confirmation', () => {
            cy.loginAs('user');
            cy.visit('/en/examples');

            cy.contains('[data-test=list-row]', 'Notes on a first vet visit').within(() => {
                cy.get('[data-test=row-delete]').click();
            });
            cy.get('[data-test=app-dialog-confirm]').click();

            cy.contains('Example deleted').should('exist');
            cy.contains('[data-test=list-row]', 'Notes on a first vet visit').should('not.exist');
        });
    });
});
