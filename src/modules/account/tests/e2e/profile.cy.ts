/**
 * @module
 * End-to-end self-service account surface: password change, sessions, the address book and email
 * verification — run against the real API in its demo profile so the invariants under test (one
 * default address, a `current` session flag, unverify-on-email-change) are the backend's own.
 *
 * What these specs pin is the page honouring those invariants, not the rules themselves — those
 * are the backend's to test.
 */
/**
 * Fills the address dialog's six required inputs and saves.
 */
const fillAddress = (label: string, street: string) => {
    cy.get('[data-test=address-dialog]').within(() => {
        cy.get('input').eq(0).should('not.be.disabled').clear();
        cy.get('input').eq(0).should('not.be.disabled').type(label);
        cy.get('input').eq(1).should('not.be.disabled').clear();
        cy.get('input').eq(1).should('not.be.disabled').type('Ada Lovelace');
        cy.get('input').eq(2).should('not.be.disabled').clear();
        cy.get('input').eq(2).should('not.be.disabled').type(street);
        cy.get('input').eq(3).should('not.be.disabled').clear();
        cy.get('input').eq(3).should('not.be.disabled').type('41121');
        cy.get('input').eq(4).should('not.be.disabled').clear();
        cy.get('input').eq(4).should('not.be.disabled').type('Modena');
        cy.get('input').eq(5).should('not.be.disabled').clear();
        cy.get('input').eq(5).should('not.be.disabled').type('IT');
    });
    cy.get('[data-test=address-save]').click();
};

describe('Profile access', () => {
    it('a guest asking for /profile lands on the login, target remembered', () => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en/profile');

        cy.get('#login-page').should('exist');
        cy.url().should('include', 'continue=');
    });

    it('a token nobody was sent does not verify — the token is the credential', () => {
        // The confirm route is public (the visitor from the email link is not necessarily
        // signed in), so the token carries all the authority — and one the API never issued
        // into its outbox is refused. The happy guest path lives in registration.cy.ts, where
        // the token comes from an actual signup email.
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en/verify-email/confirm?token=a-token-nobody-issued');

        cy.get('[data-test=verify-token] input').should('have.value', 'a-token-nobody-issued');
        cy.get('[data-test=verify-submit]').click();

        // The 422 keeps the visitor on the page; neither the success toast nor the redirect come.
        cy.get('#verify-email-confirm-page').should('exist');
        cy.contains('Email address verified').should('not.exist');
    });
});

/**
 * "Another device" is a second real login, made server-side so the page's own refresh cookie —
 * and which session counts as current — stays untouched (see cypress.config.ts).
 */
const loginFromAnotherDevice = () =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.task('createSession', {
                apiUrl: String(apiUrl),
                email: 'gino@pino.it',
                password: 'password'
            })
        )
        .then((created) => expect(created, 'the second session').to.equal(true));

describe('Profile self-service', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get('#profile-page').should('exist');
    });

    describe('language preference', () => {
        it('saving a language switches the page and survives the next sign-in', () => {
            cy.get('[data-test=profile-language]').click();
            cy.get('.v-overlay-container').contains('.v-list-item', 'italian').click();
            cy.get('#profile-page form button[type=submit]').first().click();

            // Both halves of a language switch: the runtime, and the `:locale` segment the
            // route guard re-applies on the next navigation. Without the second the page would
            // read Italian until the visitor clicked anything at all.
            cy.url().should('include', '/it/');
            cy.contains('Salva modifiche').should('exist');

            // The point of storing it on the record rather than in the tab: a fresh session
            // opens in the language the visitor chose. `loginAs` starts at `/en/login`, so the
            // Italian landing is the record's doing and not a leftover URL.
            //
            // Matched with an anchor rather than `include '/it/'`: login lands on Home, whose
            // path is `/it` with nothing after it.
            cy.logout();
            cy.loginAs('user');
            cy.url().should('match', /\/it(\/|$)/);
        });
    });

    describe('role', () => {
        it('offers no role control to a standard user', () => {
            // The select is not merely disabled: a non-admin has no business being shown a
            // control whose endpoint would answer them 403.
            cy.get('[data-test=profile-role]').should('not.exist');
        });

        it('lets an administrator see it, and asks before rights are given away', () => {
            cy.logout();
            cy.loginAs('admin');
            cy.visit('/en/profile');

            cy.get('[data-test=profile-role]').should('exist');
            // Nothing to apply until the select is moved off what the record says.
            cy.get('[data-test=role-submit]').should('be.disabled');

            cy.get('[data-test=role-select]').click();
            cy.get('.v-overlay-container').contains('.v-list-item', 'Standard user').click();
            cy.get('[data-test=role-submit]').should('not.be.disabled').click();

            // Self-demotion is the one change here nobody can undo for themselves, so it asks.
            // Declining must leave both the select and the rights exactly as they were — which
            // is also why this spec never commits the change: the demo admin stays an admin for
            // every other spec in the run.
            cy.get('[data-test=app-dialog-cancel]').click();
            cy.contains('Role updated').should('not.exist');
            cy.get('[data-test=profile-role]').should('exist');
            cy.get('[data-test=role-submit]').should('be.disabled');
        });
    });

    describe('password change', () => {
        it('changes the password through the current-password flow', () => {
            cy.get('[data-test=toggle-change-password]').click();
            // gino's real one; the new one satisfies `usersPasswordSchema` — the submit is no longer
            // disabled behind an invalid form, it reveals the errors, so the fixture must pass them.
            cy.get('[data-test=current-password] input').should('not.be.disabled').type('password');
            cy.get('[data-test=new-password] input')
                .should('not.be.disabled')
                .type('BrandNew_Secret1!');
            cy.get('[data-test=new-password-confirm] input')
                .should('not.be.disabled')
                .type('BrandNew_Secret1!');
            cy.get('[data-test=submit-password-change]').click();

            cy.contains('Password changed').should('exist');
        });

        it('surfaces a wrong current password as an error, not a logout', () => {
            cy.get('[data-test=toggle-change-password]').click();
            cy.get('[data-test=current-password] input')
                .should('not.be.disabled')
                .type('wrong-password');
            cy.get('[data-test=new-password] input')
                .should('not.be.disabled')
                .type('BrandNew_Secret1!');
            cy.get('[data-test=new-password-confirm] input')
                .should('not.be.disabled')
                .type('BrandNew_Secret1!');
            cy.get('[data-test=submit-password-change]').click();

            // The toast shows the envelope's status message (the app's convention for API
            // failures); the session survives — the page is still the profile.
            cy.contains('Unprocessable Entity').should('exist');
            cy.get('#profile-page').should('exist');
        });
    });

    describe('sessions', () => {
        it('lists the live sessions with the current one flagged', () => {
            loginFromAnotherDevice();
            cy.reload();

            cy.get('[data-test=sessions-list] [data-test=session-item]').should('have.length', 2);
            cy.get('[data-test=session-current]').should('have.length', 1);
        });

        it('revokes another device and the list agrees', () => {
            loginFromAnotherDevice();
            cy.reload();

            cy.get('[data-test=session-item]')
                .not(':has([data-test=session-current])')
                .find('[data-test=session-revoke]')
                .click();

            cy.get('[data-test=sessions-list] [data-test=session-item]').should('have.length', 1);
            cy.get('[data-test=session-current]').should('have.length', 1);
        });
    });

    describe('address book', () => {
        it('shows the seeded default and a new entry joins it without stealing the slot', () => {
            // The dataset seeds ONE saved address — checkout picks it without asking — so the
            // book never starts empty for the demo user.
            cy.get('[data-test=address-item]').should('have.length', 1);
            cy.get('[data-test=address-default]').should('have.length', 1);

            cy.get('[data-test=address-add]').click();
            fillAddress('home', 'Via Roma 1');

            cy.get('[data-test=address-item]').should('have.length', 2);
            cy.get('[data-test=address-default]').should('have.length', 1);
        });

        it('keeps exactly one default across promote and remove', () => {
            cy.get('[data-test=address-add]').click();
            fillAddress('office', 'Via Milano 2');

            // The seeded entry plus the new one, still one default — the seeded one.
            cy.get('[data-test=address-item]').should('have.length', 2);
            cy.get('[data-test=address-default]').should('have.length', 1);

            // Promote the office; the slot moves, it does not duplicate.
            cy.get('[data-test=address-make-default]').click();
            cy.get('[data-test=address-default]').should('have.length', 1);
            cy.contains('[data-test=address-item]', 'office').within(() => {
                cy.get('[data-test=address-default]').should('exist');
            });

            // Remove the default; the survivor is promoted rather than leaving none.
            cy.contains('[data-test=address-item]', 'office')
                .find('[data-test=address-remove]')
                .click();
            // The app's own confirmation, not the browser's: Cypress auto-accepts only the latter.
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=address-item]').should('have.length', 1);
            cy.get('[data-test=address-default]').should('have.length', 1);
        });
    });

    describe('email verification', () => {
        it('shows no banner for a verified seed account', () => {
            cy.get('[data-test=verify-banner]').should('not.exist');
        });

        it('an email change unverifies the account and the banner appears', () => {
            // Wait for hydration the way a person does: type only once the record shows.
            cy.get('#profile-page [type=email]').should('have.value', 'gino@pino.it');
            cy.get('#profile-page [type=email]').should('not.be.disabled').clear();
            cy.get('#profile-page [type=email]')
                .should('not.be.disabled')
                .type('fresh-address@example.com');
            cy.get('#profile-page form button[type=submit]').first().click();

            cy.get('[data-test=verify-banner]').should('exist');
        });

        it('the emailed token verifies the address and the banner goes', function () {
            // The outbox is the demo profile's; against the live backend the email is real
            // and unreadable from a browser.
            cy.skipUnlessDemo();

            // Unverify first, through the same email change a real user would make.
            cy.get('#profile-page [type=email]').should('have.value', 'gino@pino.it');
            cy.get('#profile-page [type=email]').should('not.be.disabled').clear();
            cy.get('#profile-page [type=email]')
                .should('not.be.disabled')
                .type('fresh-address@example.com');
            cy.get('#profile-page form button[type=submit]').first().click();
            cy.get('[data-test=verify-banner]').should('exist');

            // Ask for the link, then read it from the outbox — the token that arrived is the
            // only one the API will accept, exactly like the link in a real inbox.
            cy.get('[data-test=verify-resend]').click();
            // The toast confirms the round trip landed, so the outbox read below cannot race it.
            cy.contains('Verification email sent').should('exist');
            cy.demoEmailTo('fresh-address@example.com').then(({ token }) => {
                cy.visit(`/en/verify-email/confirm?token=${token}`);
            });
            cy.get('[data-test=verify-submit]').click();

            cy.get('#home-page').should('exist');
            cy.visit('/en/profile');
            cy.get('[data-test=verify-banner]').should('not.exist');
        });
    });
});
