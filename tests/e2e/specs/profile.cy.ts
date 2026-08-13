/**
 * The self-service account surface: password change, sessions, the address book and email
 * verification — everything the profile page grew when the API stopped being admin-only about
 * the visitor's own record.
 *
 * Runs against the mock profile. The MSW handlers keep the same invariants the API does (one
 * default address, sessions with a `current` flag, an email change unverifying the account), so
 * what these specs pin is the page honouring those invariants — not the arithmetic behind them.
 */
/** Fills the address dialog's six required inputs and saves. */
const fillAddress = (label: string, street: string) => {
    cy.get('[data-test=address-dialog]').within(() => {
        cy.get('input').eq(0).clear();
        cy.get('input').eq(0).type(label);
        cy.get('input').eq(1).clear();
        cy.get('input').eq(1).type('Ada Lovelace');
        cy.get('input').eq(2).clear();
        cy.get('input').eq(2).type(street);
        cy.get('input').eq(3).clear();
        cy.get('input').eq(3).type('41121');
        cy.get('input').eq(4).clear();
        cy.get('input').eq(4).type('Modena');
        cy.get('input').eq(5).clear();
        cy.get('input').eq(5).type('IT');
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

    it('a guest can spend a verification token — the route is public, the token is the credential', () => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en/verify-email/confirm?token=a-perfectly-good-token');

        cy.get('[data-test=verify-token] input').should('have.value', 'a-perfectly-good-token');
        cy.get('[data-test=verify-submit]').click();
        cy.contains('Email address verified').should('exist');
        cy.get('#home-page').should('exist');
    });
});

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
            cy.get('[data-test=current-password] input').type('ginogino');
            cy.get('[data-test=new-password] input').type('brand-new-secret');
            cy.get('[data-test=new-password-confirm] input').type('brand-new-secret');
            cy.get('[data-test=submit-password-change]').click();

            cy.contains('Password changed').should('exist');
        });

        it('surfaces a wrong current password as an error, not a logout', () => {
            cy.get('[data-test=toggle-change-password]').click();
            cy.get('[data-test=current-password] input').type('wrong-password');
            cy.get('[data-test=new-password] input').type('brand-new-secret');
            cy.get('[data-test=new-password-confirm] input').type('brand-new-secret');
            cy.get('[data-test=submit-password-change]').click();

            // The toast shows the envelope's status message (the app's convention for API
            // failures); the session survives — the page is still the profile.
            cy.contains('Unprocessable Entity').should('exist');
            cy.get('#profile-page').should('exist');
        });
    });

    describe('sessions', () => {
        it('lists the live sessions with the current one flagged', () => {
            cy.get('[data-test=sessions-list] [data-test=session-item]').should('have.length', 2);
            cy.get('[data-test=session-current]').should('have.length', 1);
        });

        it('revokes another device and the list agrees', () => {
            cy.get('[data-test=session-item]')
                .not(':has([data-test=session-current])')
                .find('[data-test=session-revoke]')
                .click();

            cy.get('[data-test=sessions-list] [data-test=session-item]').should('have.length', 1);
            cy.get('[data-test=session-current]').should('have.length', 1);
        });
    });

    describe('address book', () => {
        it('starts empty and the first entry becomes the default', () => {
            cy.get('[data-test=addresses-empty]').should('exist');

            cy.get('[data-test=address-add]').click();
            fillAddress('home', 'Via Roma 1');

            cy.get('[data-test=address-item]').should('have.length', 1);
            cy.get('[data-test=address-default]').should('have.length', 1);
        });

        it('keeps exactly one default across promote and remove', () => {
            cy.get('[data-test=address-add]').click();
            fillAddress('home', 'Via Roma 1');
            cy.get('[data-test=address-add]').click();
            fillAddress('office', 'Via Milano 2');

            // Two entries, still one default — the first one.
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
            cy.get('#profile-page [type=email]').clear();
            cy.get('#profile-page [type=email]').type('fresh-address@example.com');
            cy.get('#profile-page form button[type=submit]').first().click();

            cy.get('[data-test=verify-banner]').should('exist');
        });

        it('the emailed token verifies the address and the banner goes', () => {
            // Unverify first, through the same email change a real user would make.
            cy.get('#profile-page [type=email]').should('have.value', 'gino@pino.it');
            cy.get('#profile-page [type=email]').clear();
            cy.get('#profile-page [type=email]').type('fresh-address@example.com');
            cy.get('#profile-page form button[type=submit]').first().click();
            cy.get('[data-test=verify-banner]').should('exist');

            cy.visit('/en/verify-email/confirm?token=a-perfectly-good-token');
            cy.get('[data-test=verify-submit]').click();

            cy.get('#home-page').should('exist');
            cy.visit('/en/profile');
            cy.get('[data-test=verify-banner]').should('not.exist');
        });
    });
});
