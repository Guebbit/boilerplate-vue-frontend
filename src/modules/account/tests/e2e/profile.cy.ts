/**
 * The self-service account surface: password change, sessions, the address book and email
 * verification — everything the profile page grew when the API stopped being admin-only about
 * the visitor's own record.
 *
 * Runs against the real API in its demo profile, so the invariants behind these assertions (one
 * default address, sessions with a `current` flag, an email change unverifying the account) are
 * the service's own. What these specs pin is the page honouring them, not the rules themselves —
 * those are the backend's to test.
 */
/** Fills the address dialog's six required inputs and saves. */
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

    describe('password change', () => {
        it('changes the password through the current-password flow', () => {
            cy.get('[data-test=toggle-change-password]').click();
            cy.get('[data-test=current-password] input').should('not.be.disabled').type('password'); // gino's real one
            cy.get('[data-test=new-password] input')
                .should('not.be.disabled')
                .type('brand-new-secret');
            cy.get('[data-test=new-password-confirm] input')
                .should('not.be.disabled')
                .type('brand-new-secret');
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
                .type('brand-new-secret');
            cy.get('[data-test=new-password-confirm] input')
                .should('not.be.disabled')
                .type('brand-new-secret');
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
