// requires-module: account, inventory, users
/**
 * @module
 * AT7 · Staff accounts. The admin creates a warehouse account with a role and a language, asking
 * for a setup email instead of typing a password. The mail arrives in that language, its link
 * sets the password, and the new staff member signs in to exactly the warehouse's menu. The admin
 * then edits phone, website and avatar, and meets the stale-record guard when someone else saved
 * first.
 *
 * `warehouse` because the admin may only grant what it holds itself, and holds every warehouse
 * key; a moderator would be refused most roles (JB12). The address is the story's own: no seed
 * knows it, so it is logged into through the form, not `cy.loginAs`.
 */
import { mailedLinkUrl, expectMailTemplate } from '../../../support/e2e/commands';
import { signInWith } from '../../../support/e2e/steps';

/** The new staff member, and the password the mailed link sets. */
const STAFF = {
    email: 'new.warehouse@example.com',
    username: 'newwarehouse',
    password: 'Stocked_Shelf1!'
};

/** The Italian subject of the setup mail (`account/locales/it.json`: `setup-request.subject`). */
const ITALIAN_SETUP_SUBJECT = 'Configura il tuo account';

/** What the admin types into the edit form. */
const EDITED = { phone: '+39 055 1234567', website: 'https://warehouse.example.com' };

/**
 * The hrefs of the open administration menu, then closes it.
 *
 * @returns a chain yielding the hrefs
 */
const adminMenuLinks = (): Cypress.Chainable<string[]> => {
    cy.get('[data-test=admin-menu]').click();
    return cy
        .get('[role=menu] a')
        .then(($links) => $links.toArray().map((link) => link.getAttribute('href') ?? ''))
        .then((hrefs) => {
            cy.get('body').type('{esc}');
            return cy.wrap(hrefs, { log: false });
        });
};

describe('AT7 · Staff accounts', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a created staff member is mailed a setup link in their language, and sees their own menu', () => {
        cy.skipUnlessMailbox();
        cy.loginAs('admin');

        cy.step('create the account: role, language, setup email instead of a password');
        cy.visit('/en/users/create');
        cy.get('[data-test=user-email] input').type(STAFF.email);
        cy.get('[data-test=user-username] input').type(STAFF.username);
        cy.get('[data-test=user-send-setup-email] input').check();
        // A setup email is what makes a password optional: the field is shut.
        cy.get('[data-test=user-password] input').should('be.disabled');
        cy.pickOption('[data-test=user-role]', 'warehouse');
        cy.pickOption('[data-test=user-locale]', 'italian');
        cy.get('#user-create-page form').submit();
        cy.location('pathname').should('match', /\/en\/users\/[\da-f]{24}$/);

        cy.step('the mail is Italian, and its link sets the password');
        cy.emailTo(STAFF.email).then((email) => {
            expectMailTemplate(email, 'account.setup-request');
            expect(email.subject).to.equal(ITALIAN_SETUP_SUBJECT);
            cy.logout();
            cy.visit(mailedLinkUrl(email));
        });
        cy.get('#password-reset-confirm-page [type=password]').eq(0).type(STAFF.password);
        cy.get('#password-reset-confirm-page [type=password]').eq(1).type(STAFF.password);
        cy.get('#password-reset-confirm-page button[type=submit]').click();
        cy.get('#login-page').should('exist');

        cy.step('the new staff member sees the warehouse menu and nothing of the rest');
        signInWith(STAFF.email, STAFF.password);
        // Their own language (Italian), so the links are read by where they lead, not by prefix.
        adminMenuLinks().should((links) => {
            const leadsTo = (page: string): boolean => links.some((href) => href.endsWith(page));
            expect(leadsTo('/inventory')).to.equal(true);
            expect(leadsTo('/users')).to.equal(false);
            expect(leadsTo('/locales')).to.equal(false);
            expect(leadsTo('/audit')).to.equal(false);
        });
    });

    it('phone, website and avatar survive a reload, and a stale save is refused until reloaded', () => {
        cy.loginAs('admin');
        cy.accountOf('editor').then(({ email }) => {
            cy.apiAs<{ items: { id: string }[] }>('admin', 'POST', '/users/search', { email }).then(
                (found) => {
                    const userId = String(found?.items[0]?.id);

                    cy.step('edit phone, website and avatar');
                    cy.visit(`/en/users/${userId}/edit`);
                    cy.get('[data-test=user-edit-username] input').should('not.have.value', '');
                    cy.get('[data-test=user-edit-phone] input').clear();
                    cy.get('[data-test=user-edit-phone] input').type(EDITED.phone);
                    cy.get('[data-test=user-edit-website] input').clear();
                    cy.get('[data-test=user-edit-website] input').type(EDITED.website);
                    cy.get('[data-test=user-edit-avatar] input[type=file]').selectFile(
                        'tests/e2e/fixtures/sample-image.png',
                        { force: true }
                    );
                    cy.get('#user-edit-page form').submit();
                    cy.contains('User updated successfully').should('exist');

                    cy.step('each field is still there after a reload');
                    cy.visit(`/en/users/${userId}/edit`);
                    cy.get('[data-test=user-edit-phone] input').should('have.value', EDITED.phone);
                    cy.get('[data-test=user-edit-website] input').should(
                        'have.value',
                        EDITED.website
                    );
                    cy.get('[data-test=user-edit-avatar] img').should('have.attr', 'src');

                    cy.step('somebody else saves first: the stale save is refused');
                    cy.apiAs('admin', 'PATCH', `/users/${userId}`, { phone: '+39 000 0000000' });
                    cy.get('[data-test=user-edit-website] input').clear();
                    cy.get('[data-test=user-edit-website] input').type('https://stale.example.com');
                    cy.get('#user-edit-page form').submit();
                    cy.get('[data-test=user-edit-reload-latest]').should('exist');

                    cy.step('reloading shows their change, and the next save goes through');
                    cy.get('[data-test=user-edit-reload-latest]').click();
                    cy.get('[data-test=user-edit-phone] input').should(
                        'have.value',
                        '+39 000 0000000'
                    );
                    cy.get('[data-test=user-edit-reload-latest]').should('not.exist');
                    cy.get('[data-test=user-edit-website] input').clear();
                    cy.get('[data-test=user-edit-website] input').type('https://fresh.example.com');
                    cy.get('#user-edit-page form').submit();
                    cy.contains('User updated successfully').should('exist');
                    cy.visit(`/en/users/${userId}/edit`);
                    cy.get('[data-test=user-edit-website] input').should(
                        'have.value',
                        'https://fresh.example.com'
                    );
                }
            );
        });
    });
});
