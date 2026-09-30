/**
 * Image upload, end to end — the shell-generic half.
 *
 * "Product edit"/"Product create"/"Live backend" exercised the same shared mechanism
 * (`FormImageUpload.vue`, multer, the digest/thumbnail worker) through a product form; FA122
 * moved them to `src/modules/products/tests/e2e/uploads.cy.ts` since a build with no catalogue has
 * nothing left to open there. What stays here — "User create" and "Signup" — is foundation: both
 * modules ship with every deployment, so this file no longer depends on the shop being present.
 *
 * ── How "the request was multipart" is asserted ──────────────────────────────
 * Not with `cy.intercept`, but on the consequence: the API stores a file and answers a server
 * path for it only when a `File` part actually arrived, so a preview whose `src` becomes that
 * path is proof that the body was multipart and that the file survived the trip. An assertion on
 * the outcome keeps working whatever the transport does.
 */
import { pollForImageSource, UPLOAD_PATH } from '../../support/e2e/images';

/** Picks the fixture image. `force` because Vuetify keeps the real input visually hidden. */
const selectSampleImage = () =>
    cy.get('input[type=file]').selectFile('tests/e2e/fixtures/sample-image.png', { force: true });

describe('Image upload', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('User create', () => {
        /**
         * The create branch, which takes a different generated client
         * (`createUserWithMultipart`) and a different endpoint from the update branch above.
         */
        it('creates a user with an avatar and lands on their detail page', () => {
            cy.loginAs('admin');
            cy.visit('/en/users/create');

            cy.get('input[type=email]').should('not.be.disabled').type('uploader@example.com');
            cy.get('#user-create-page input[type=text]')
                .first()
                .should('not.be.disabled')
                .type('uploader');
            cy.get('input[type=password]').should('not.be.disabled').type('Hunter2hunter2!');
            selectSampleImage();
            cy.get('form').submit();

            cy.contains('User created successfully').should('exist');
            cy.url().should('include', '/users/');
            // The toast and the URL would both hold if the file were dropped on the way: the
            // detail page rendering the uploaded path is the proof it was stored.
            pollForImageSource(
                '#user-target [data-test=lazy-image] img:not([data-test=lazy-image-thumbnail])',
                UPLOAD_PATH
            ).should('match', UPLOAD_PATH);
        });
    });

    describe('Signup', () => {
        /**
         * `POST /account/signup` takes no file, so the avatar is a second request. This is the case that
         * would silently drop the file if the follow-up were ever skipped.
         */
        it('registers an account with a profile image, sent as a follow-up PATCH /account', () => {
            cy.visit('/en/signup');

            cy.get('input[type=email]').should('not.be.disabled').type('newcomer@example.com');
            cy.get('input[type=password]')
                .first()
                .should('not.be.disabled')
                .type('Hunter2hunter2!');
            cy.get('input[type=password]').eq(1).should('not.be.disabled').type('Hunter2hunter2!');
            selectSampleImage();
            cy.get('input[type=checkbox]').first().check({ force: true });
            cy.get('form').submit();

            // Signed in from signup, so the upload's success is the new account's own page
            // rather than a login form.
            cy.url().should('not.include', '/signup');
            cy.get('#home-page').should('exist');

            // The follow-up PATCH is the part that can silently go missing, and it leaves no trace
            // on the landing page: the profile's avatar preview is where the stored path shows.
            cy.visit('/en/profile');
            pollForImageSource('img[alt="Image preview"]', UPLOAD_PATH).should(
                'match',
                UPLOAD_PATH
            );
        });
    });
});
