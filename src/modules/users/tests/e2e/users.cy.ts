/**
 * @module
 * Cypress end-to-end spec driving the real app: list, create, edit, soft-delete/restore and
 * hard-delete for the admin-only users module. The a11y and visual specs are separate;
 * this one is the functional coverage of create, edit, delete and list.
 */

/** A value unique enough per run that two specs racing the same backend cannot collide. */
const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Fresh navigation to the users list, filtered to exactly one username.
 *
 * A real `cy.visit()` rather than re-using the current page's own search: `handleDelete`/
 * `handleRestore` each schedule their OWN reload after their own async chain settles (a toast,
 * THEN a `search(true)`), so switching the deleted-filter select right after clicking one of
 * those actions can race that reload — two searches in flight, and whichever the store resolves
 * last silently wins. A fresh page load has no such background reload to race.
 *
 * @param username - the exact username to filter to
 * @param deleted - which deleted-filter option to select before submitting the search
 */
const searchUser = (username: string, deleted: 'All' | 'Not deleted') => {
    cy.visit('/en/users');
    cy.get('[data-test=filter-username] input').type(username);
    cy.pickOption('[data-test=filter-deleted]', deleted);
    // The selects only set the filter; the search runs on submit, so the click comes last.
    cy.get('[data-test=search-submit]').click();
};

describe('Users', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
    });

    describe('Users list', () => {
        beforeEach(() => {
            cy.visit('/en/users');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);
        });

        it('shows the page title and one row per user returned by the API', () => {
            cy.get('#users-list-page').should('exist');
            cy.get('h1').should('contain.text', 'Users');
            cy.get('[data-test=list-row]').should('have.length.at.least', 1);
        });

        it('shows view, edit, access, delete and hard-delete actions for an active row', () => {
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.get('[data-test=row-view]').should('exist');
                    cy.get('[data-test=row-edit]').should('exist');
                    cy.get('[data-test=row-access]').should('exist');
                    cy.get('[data-test=row-delete]').should('exist');
                    cy.get('[data-test=row-restore]').should('not.exist');
                    cy.get('[data-test=row-hard-delete]').should('exist');
                });
        });
    });

    describe('Create', () => {
        it('creates a user through the real form and lands on their detail page', () => {
            const username = `e2e-user-${unique()}`;
            const email = `${username}@example.com`;

            cy.visit('/en/users/create');
            cy.get('[data-test=user-email] input').type(email);
            cy.get('[data-test=user-username] input').type(username);
            cy.get('[data-test=user-password] input').type('NewUser_Pass1!');
            cy.get('form').submit();

            cy.url().should('include', '/users/').and('not.include', '/create');
            cy.contains(username).should('exist');
        });
    });

    describe('Edit', () => {
        it('edits a user through the real form and the change survives a reload', () => {
            const originalUsername = `e2e-edit-${unique()}`;
            const editedUsername = `e2e-edited-${unique()}`;
            const email = `${originalUsername}@example.com`;

            cy.visit('/en/users/create');
            cy.get('[data-test=user-email] input').type(email);
            cy.get('[data-test=user-username] input').type(originalUsername);
            cy.get('[data-test=user-password] input').type('NewUser_Pass1!');
            cy.get('form').submit();
            cy.url().should('include', '/users/').and('not.include', '/create');

            cy.url().then((url) => {
                const id = url.split('/users/')[1]?.replace(/\/$/, '');

                cy.visit(`/en/users/${id}/edit`);
                // Waits for the form to hydrate from the fetched record — and doubles as proof the
                // create above actually persisted the username being edited here.
                cy.get('[data-test=user-edit-username] input').should(
                    'have.value',
                    originalUsername
                );
                cy.get('[data-test=user-edit-username] input').clear();
                cy.get('[data-test=user-edit-username] input').type(editedUsername);
                cy.get('form').submit();
                cy.contains('User updated successfully').should('exist');

                cy.reload();
                cy.get('[data-test=user-edit-username] input').should('have.value', editedUsername);
            });
        });
    });

    describe('Delete, restore and hard-delete', () => {
        it('soft-deletes a user, restores it, then permanently removes it', () => {
            const username = `e2e-delete-${unique()}`;
            const email = `${username}@example.com`;

            cy.visit('/en/users/create');
            cy.get('[data-test=user-email] input').type(email);
            cy.get('[data-test=user-username] input').type(username);
            cy.get('[data-test=user-password] input').type('NewUser_Pass1!');
            cy.get('form').submit();
            cy.url().should('include', '/users/').and('not.include', '/create');

            // Narrowed by username throughout: the seeded scenario ships enough other users that
            // the default page would not reliably show this one, deleted-filter aside.
            searchUser(username, 'All');

            cy.contains('[data-test=list-row]', username).within(() => {
                cy.get('[data-test=row-delete]').click();
            });
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.contains('User deleted successfully').should('exist');

            // A fresh search — see searchUser's own note on racing a row action's reload — proves
            // the soft-delete actually took effect server-side, not just that a toast fired.
            searchUser(username, 'All');
            cy.contains('[data-test=list-row]', username).within(() => {
                cy.get('[data-test=row-deleted]').should('exist');
            });

            // The default filter excludes deleted rows.
            searchUser(username, 'Not deleted');
            cy.contains('[data-test=list-row]', username).should('not.exist');

            searchUser(username, 'All');
            cy.contains('[data-test=list-row]', username).within(() => {
                cy.get('[data-test=row-restore]').click();
            });
            cy.contains('User restored').should('exist');

            // A fresh search, same as the delete check above — proves the restore is real on the
            // server, not just an optimistic client-side flip. Reads directly off the row's own
            // state (the badge gone, `row-delete` back in place of `row-restore`) rather than the
            // "Not deleted" filter: that filter's own `deletedAt: null` semantics are the search
            // endpoint's contract, not this row action's behaviour, and are not what this test is
            // about.
            searchUser(username, 'All');
            cy.contains('[data-test=list-row]', username).within(() => {
                cy.get('[data-test=row-deleted]').should('not.exist');
                cy.get('[data-test=row-restore]').should('not.exist');
                cy.get('[data-test=row-delete]').should('exist');
            });
            cy.contains('[data-test=list-row]', username).within(() => {
                cy.get('[data-test=row-hard-delete]').click();
            });
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.contains('User permanently deleted').should('exist');

            searchUser(username, 'All');
            cy.contains('[data-test=list-row]', username).should('not.exist');
        });
    });
});
