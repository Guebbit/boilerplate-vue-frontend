/**
 * @module
 * Cypress end-to-end spec driving the real app: submits the public contact form, then reads the
 * resulting task back through the admin inbox — the tasks module's whole loop, driven the way
 * a visitor and then an admin would drive it. The inbox starts empty on purpose — the demo profile
 * seeds no tasks — so the form IS the fixture.
 */
describe('Tasks', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('a message sent through the form lands in the inbox', () => {
        // One page session throughout: the admin walks from the form to the inbox through the
        // app's own navigation, which is the more honest test of the two pages being wired
        // together — and the only one that proves the task survived without a reload.
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input')
            .should('not.be.disabled')
            .type('curious@example.com');
        cy.get('[data-test=contact-subject] input')
            .should('not.be.disabled')
            .type('A question about the cats');
        cy.textareaIn('contact-message')
            .should('not.be.disabled')
            .type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();
        cy.contains('Message sent').should('exist');

        cy.navigateViaMenu('admin', '/en/tasks');
        cy.get('[data-test=task-item]').should('have.length', 1);
        cy.contains('[data-test=task-item]', 'A question about the cats').should('exist');
    });

    it('a submission caught by the honeypot lands in the inbox already marked spam', () => {
        // A real visitor never reaches this field — see Contact.vue's own comment on it — so
        // filling it is what a generic bot autofill does, not what a person driving the UI would.
        // `{ force: true }` is what makes Cypress fill an element it would otherwise refuse to
        // touch for being invisible, which is the honeypot's whole point.
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('bot@example.com');
        cy.get('[data-test=contact-subject] input').type('Buy now');
        cy.textareaIn('contact-message').type('Cheap products, click here.');
        cy.get('[data-test=contact-website]').type('https://spam-bot.example', { force: true });
        cy.get('[data-test=contact-submit]').click();
        // The BE's whole point: the bot sees the same success a real visitor does.
        cy.contains('Message sent').should('exist');

        cy.navigateViaMenu('admin', '/en/tasks');
        cy.get('[data-test=task-item]').should('have.length', 1);
        cy.get('[data-test=task-status]').should('contain.text', 'Spam');
    });

    it('an admin can permanently delete a task, and it disappears from the inbox', () => {
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.textareaIn('contact-message').type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();

        cy.navigateViaMenu('admin', '/en/tasks');
        cy.get('[data-test=task-item]').should('have.length', 1);

        cy.intercept('DELETE', '**/tasks/*').as('delete');

        cy.get('[data-test=task-delete]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.wait('@delete').its('response.statusCode').should('eq', 204);

        cy.get('[data-test=task-item]').should('have.length', 0);
        cy.contains('Task deleted').should('exist');

        // A fresh load must not hand the row back — the inbox reads through POST /tasks/search,
        // which no browser cache answers, unlike GET /tasks's 30-second max-age.
        cy.reload();
        cy.get('#task-inbox-page').should('exist');
        cy.get('[data-test=task-item]').should('have.length', 0);
    });

    it('an admin can add a note on the detail page, and it survives a reload', () => {
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.textareaIn('contact-message').type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();

        cy.navigateViaMenu('admin', '/en/tasks');
        cy.get('[data-test=task-item]').should('have.length', 1);
        cy.get('[data-test=task-open]').click();
        cy.get('#task-detail-page').should('exist');

        cy.intercept('POST', '**/tasks/*/notes').as('addNote');
        cy.textareaIn('task-note-draft').type('Called back, waiting on legal.');
        cy.get('[data-test=task-note-add]').click();
        cy.wait('@addNote')
            .its('request.body')
            .should('deep.equal', { body: 'Called back, waiting on legal.' });
        cy.contains('Note added.').should('exist');

        // A fresh load must read the note back from the server, not a client-only draft.
        cy.reload();
        cy.get('[data-test=task-note]').should('contain.text', 'Called back, waiting on legal.');
    });

    it('taking a task assigns it to the viewer and shows the assignee', () => {
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.textareaIn('contact-message').type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();

        cy.navigateViaMenu('admin', '/en/tasks');
        cy.get('[data-test=task-assignee]').should('not.exist');
        cy.get('[data-test=task-take]').click();
        cy.contains('Task taken.').should('exist');
        cy.get('[data-test=task-assignee]').should('exist');
    });

    it('resolving a task records and shows when it was responded to', () => {
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.textareaIn('contact-message').type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();

        cy.navigateViaMenu('admin', '/en/tasks');
        cy.get('[data-test=task-responded-at]').should('not.exist');

        cy.get('[data-test=task-resolve]').click();
        cy.contains('Status updated.').should('exist');
        cy.get('[data-test=task-status]').should('contain.text', 'Resolved');

        // Set by the backend the first time a task becomes resolved: never sent by this UI.
        cy.get('[data-test=task-responded-at]').should('exist');
    });

    it('declining the delete confirmation leaves the task in place', () => {
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.textareaIn('contact-message').type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();

        cy.navigateViaMenu('admin', '/en/tasks');
        cy.get('[data-test=task-item]').should('have.length', 1);

        cy.get('[data-test=task-delete]').click();
        cy.get('[data-test=app-dialog-cancel]').click();

        cy.get('[data-test=task-item]').should('have.length', 1);
    });

    it('rejects an empty form with field errors, not a request', () => {
        cy.env(['apiUrl']).then(({ apiUrl }) => {
            cy.intercept('POST', `${String(apiUrl)}/tasks`).as('taskSubmit');
        });
        cy.visit('/en/contact');
        cy.get('[data-test=contact-submit]').click();
        cy.get('.v-messages__message').should('exist');
        // Read after the errors show: a request the click had fired would be counted by now.
        cy.get('@taskSubmit.all').should('have.length', 0);
    });

    it('the inbox is admin-only: a plain user is sent home with the forbidden notice', () => {
        cy.loginAs('user');
        cy.env(['apiUrl']).then(({ apiUrl }) => {
            cy.intercept('POST', `${String(apiUrl)}/tasks/search`).as('inboxSearch');
        });
        cy.visit('/en/tasks');

        // Not merely "the inbox is absent" — where they LANDED is the assertion, because a
        // blank error page would also have no inbox and prove nothing.
        cy.get('#home-page').should('exist');
        cy.get('#task-inbox-page').should('not.exist');
        // The notice is asserted as shown, not by its wording: the copy belongs to the guard's
        // own unit spec.
        cy.get('.v-alert[role=status]').should('be.visible');
        // The guard stops the visitor before the page loads: the inbox is never asked for.
        cy.get('@inboxSearch.all').should('have.length', 0);
    });

    it('the inbox asks a guest to log in, keeping the target', () => {
        cy.visit('/en/tasks');

        cy.get('#login-page').should('exist');
        cy.url().should('include', 'continue=');
    });
});

describe('Static pages', () => {
    it('about renders and cross-links reach the other four', () => {
        cy.visit('/en/about');
        cy.get('#static-page-about').should('exist');

        cy.contains('a', 'FAQ').click();
        cy.get('#static-page-faq').should('exist');
        cy.get('[data-test=faq-entries]').should('exist');

        cy.contains('a', 'Terms of service').click();
        cy.get('#static-page-terms').should('exist');

        cy.contains('a', 'Privacy').click();
        cy.get('#static-page-privacy').should('exist');

        cy.contains('a', 'Legal notice').click();
        cy.get('#static-page-legal').should('exist');
        // The seller's name is the deployment's own (`NODE_SHOP_LEGAL_NAME`): read it from the shop.
        cy.env(['apiUrl'])
            .then(({ apiUrl }) => cy.request(`${String(apiUrl)}/shop`))
            .then((response) => {
                const { legalName } = response.body as { legalName: string };
                cy.get('[data-test=seller-identity]').should('contain.text', legalName);
            });
    });
});
