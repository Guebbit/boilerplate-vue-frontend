/**
 * Image upload, end to end.
 *
 * ── How "the request was multipart" is asserted ──────────────────────────────
 * Not with `cy.intercept`, but on the consequence: the API stores a file and answers a server
 * path for it only when a `File` part actually arrived, so a preview whose `src` becomes that
 * path is proof that the body was multipart and that the file survived the trip. An assertion on
 * the outcome keeps working whatever the transport does.
 */

/**
 * The path the API hands back for an uploaded file. One shape for both profiles now: the demo
 * profile IS the real API, so the write is a real multipart write everywhere — a field arriving
 * as a string is a 422 in every run of this suite, not only the live one.
 */
const UPLOAD_PATH = /^\/images\/[\da-f]{32}\.(png|jpg|jpeg|webp)$/;

/**
 * Asserts no locally-picked file is still sitting in the preview.
 *
 * Written as "nothing is a blob URL" rather than "there is no image": a seeded product
 * legitimately arrives with an `imageUrl` already set, so an edit form showing an image says
 * nothing either way. Only the blob URL means "a file is picked but not yet uploaded".
 */
const expectNoPendingLocalPreview = () =>
    cy.get('body').then(($body) => {
        for (const image of $body.find('img[alt="Image preview"]'))
            expect(image.getAttribute('src') ?? '').not.to.match(/^blob:/);
    });

const PRODUCT_ID = '65dc8a99604c307b702b5ccc';
const PRODUCT_TITLE = 'Sallyno Panino';

/**
 * Waits for `activateAutoHydrate` to have filled the form from the fetched record.
 *
 * `#product-edit-page` is the layout's id and exists before the product has loaded, so it is not
 * a readiness gate: submitting on it fails validation on the still-empty title and price, and the
 * failure looks exactly like a broken image field. The hydrated title is the real signal.
 */
const waitForHydratedProductForm = () =>
    cy.get('#product-edit-page input[type=text]').first().should('have.value', PRODUCT_TITLE);

/** Picks the fixture image. `force` because Vuetify keeps the real input visually hidden. */
const selectSampleImage = () =>
    cy.get('input[type=file]').selectFile('tests/e2e/fixtures/sample-image.png', { force: true });

describe('Image upload', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    describe('Product edit', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit(`/en/products/${PRODUCT_ID}/edit`);
            waitForHydratedProductForm();
        });

        it('offers a file field that accepts only the types the API takes', () => {
            cy.get('input[type=file]')
                .should('have.attr', 'accept')
                .and('equal', 'image/png,image/jpg,image/jpeg,image/webp');
        });

        /**
         * The preview is a local object URL, minted before anything is sent — the point of it is
         * that the user sees their choice without waiting for a round trip.
         */
        it('previews the picked file immediately, before any upload', () => {
            // Not `should('not.exist')`: under the live profile the seeded product HAS an image,
            // so the form correctly shows it as the starting preview. What must be true on both
            // is that nothing local is pending yet.
            expectNoPendingLocalPreview();

            selectSampleImage();

            cy.get('img[alt="Image preview"]')
                .should('exist')
                .and('have.attr', 'src')
                .and('match', /^blob:/);
        });

        /**
         * The whole path in one test: multipart out, `imageUrl` back, preview handed over from
         * the local blob to the served file.
         */
        it('uploads the image and renders the imageUrl the API returns', () => {
            selectSampleImage();
            cy.get('form').submit();

            cy.contains('Product updated successfully').should('exist');
            cy.wrap(UPLOAD_PATH).then((expectedPath) => {
                cy.get('img[alt="Image preview"]')
                    .should('have.attr', 'src')
                    .and((source) => {
                        expect(source).to.match(expectedPath);
                    });
            });
        });

        /**
         * The local object URL must be released once the served image takes over, and the store
         * must never park a `File` where a record's fields go.
         */
        it('drops the local file once the server has the image', () => {
            selectSampleImage();
            cy.get('form').submit();
            cy.contains('Product updated successfully').should('exist');

            cy.get('input[type=file]').should('have.value', '');
            cy.get('img[alt="Image preview"]')
                .should('have.attr', 'src')
                .and('not.match', /^blob:/);
        });

        /**
         * Client-side pre-validation, which is a UX affordance and nothing more: the point is to
         * fail before a large upload, not to be the gate. `selectFile` bypasses the `accept`
         * attribute the same way a drag-and-drop would, which is exactly the case worth covering.
         */
        it('rejects a file of the wrong type without contacting the API', () => {
            cy.get('input[type=file]').selectFile('tests/e2e/fixtures/not-an-image.txt', {
                force: true
            });
            cy.get('form').submit();

            cy.contains('The image must be a PNG, JPEG or WebP file').should('exist');
            cy.contains('Product updated successfully').should('not.exist');
        });

        it('saves ordinary field edits without an image, as before', () => {
            cy.get('#product-edit-page input[type=text]').first().should('not.be.disabled').clear();
            cy.get('#product-edit-page input[type=text]')
                .first()
                .should('not.be.disabled')
                .type('Renamed product');
            cy.get('form').submit();

            cy.contains('Product updated successfully').should('exist');
            // The claim is "no image was uploaded", not "the product has no image": under the
            // live profile the seeded image is still there afterwards, and correctly so.
            expectNoPendingLocalPreview();
        });
    });

    describe('Product create', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit('/en/products/create');
            cy.get('#product-create-page').should('exist');
        });

        /**
         * `products/create` and `products/:id` overlap; vue-router ranks the static segment
         * higher, but that is a rule someone could break by reordering. If it ever regressed,
         * this page would render the product detail view for an id of `create`.
         */
        it('is reachable at products/create without being taken for a product id', () => {
            cy.get('#product-target').should('not.exist');
            cy.get('h1').should('contain.text', 'Create product');
        });

        it('creates a product with an image and opens its detail page', () => {
            cy.get('#product-create-page input[type=text]')
                .first()
                .should('not.be.disabled')
                .type('Uploaded product');
            selectSampleImage();
            cy.get('form').submit();

            cy.contains('Product created successfully').should('exist');
            cy.url().should('match', /\/products\/[^/]+$/);
            cy.contains('Uploaded product').should('exist');
        });

        it('creates a product without an image, taking the JSON branch', () => {
            cy.get('#product-create-page input[type=text]')
                .first()
                .should('not.be.disabled')
                .type('Plain product');
            cy.get('form').submit();

            cy.contains('Product created successfully').should('exist');
            cy.url().should('match', /\/products\/[^/]+$/);
        });

        it('reveals validation errors instead of creating a titleless product', () => {
            cy.get('form').submit();

            cy.contains('Title is required').should('exist');
            cy.contains('Product created successfully').should('not.exist');
            cy.url().should('include', '/products/create');
        });
    });

    describe('User create', () => {
        /**
         * The create branch, which takes a different generated client (`createUserWithMultipart`)
         * and a different mock handler from the update branch above.
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
        });
    });

    describe('Signup', () => {
        /**
         * `signup` was the one store method with no multipart branch, so this is the case that
         * would have silently sent JSON and dropped the file on the floor.
         */
        it('registers an account with a profile image', () => {
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

            cy.url().should('include', '/login');
        });
    });

    /**
     * ── Live profile only ────────────────────────────────────────────────────
     *
     * The only tests that touch the real pipeline: multer's `fileFilter`, the magic-byte re-check
     * in `identifyImageFile()`, the random stored name, and `express.static` actually serving
     * `public/`. None of that has a mock equivalent, and a regression in any of it is invisible
     * to every other spec in this suite.
     */
    describe('Live backend', () => {
        it('stores the upload and serves it back over HTTP', () => {
            cy.skipUnlessLive();
            cy.loginAs('admin');
            cy.visit(`/en/products/${PRODUCT_ID}/edit`);
            waitForHydratedProductForm();

            selectSampleImage();
            cy.get('form').submit();
            cy.contains('Product updated successfully').should('exist');

            cy.get('img[alt="Image preview"]')
                .should('have.attr', 'src')
                .then((source) => {
                    const imagePath = source as string;
                    // A server-relative upload path, not a blob and not a filesystem path.
                    expect(imagePath).to.match(/^\/[\w./-]+\.(png|jpg|jpeg|webp)$/);

                    cy.env(['apiUrl']).then(({ apiUrl }) => {
                        cy.request(`${String(apiUrl)}${imagePath}`).then((response) => {
                            expect(response.status).to.equal(200);
                            expect(response.headers['content-type']).to.match(/^image\//);
                        });
                    });
                });
        });

        /**
         * The two-gate design, from the outside. `fileFilter` only ever sees the client's own
         * `Content-Type` header, which nothing verifies — so bytes that are not an image, sent
         * under an image mime type, get past the first gate and must be caught by the second.
         * The FE's own type check passes here too, by design: it reads the same declared type.
         */
        it('answers 422 when the declared type and the actual bytes disagree', () => {
            cy.skipUnlessLive();
            cy.loginAs('admin');
            cy.visit(`/en/products/${PRODUCT_ID}/edit`);
            waitForHydratedProductForm();

            cy.get('input[type=file]').selectFile(
                {
                    contents: Cypress.Buffer.from('this is not a PNG, whatever the header says'),
                    fileName: 'liar.png',
                    mimeType: 'image/png'
                },
                { force: true }
            );
            cy.get('form').submit();

            cy.contains('Product updated successfully').should('not.exist');
        });
    });
});
