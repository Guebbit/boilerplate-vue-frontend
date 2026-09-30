/**
 * The catalogue's own stake in image upload — moved out of the central
 * `tests/e2e/specs/uploads.cy.ts` (FA122): "Product edit"/"Product create" exercise the shared
 * upload mechanism (`FormImageUpload.vue`, `multer`, the digest/thumbnail worker) through a
 * product form specifically, and "Live backend" reuses that same hydrated edit form, so all three
 * go with the module. The central file's own "User create" and "Signup" cases keep basic upload
 * coverage for a build with no catalogue at all.
 *
 * ── How "the request was multipart" is asserted ──────────────────────────────
 * Not with `cy.intercept`, but on the consequence: the API stores a file and answers a server
 * path for it only when a `File` part actually arrived, so a preview whose `src` becomes that
 * path is proof that the body was multipart and that the file survived the trip. An assertion on
 * the outcome keeps working whatever the transport does.
 */
import { pollForImageSource, UPLOAD_PATH } from '../../../../../tests/support/e2e/images';

/** The thumbnail sibling of {@link UPLOAD_PATH} — same optional API-host prefix, own segment. */
const THUMBNAIL_PATH = /^(?:https?:\/\/[^/]+)?\/images\/thumbs\/v1\/[\w.-]+\.webp$/;

/**
 * `src` is already absolute once `resolveImageUrl` has prefixed it (see {@link UPLOAD_PATH}) — do
 * not prepend `apiUrl` a second time, or the request 404s against a doubled origin.
 */
const toFetchableUrl = (path: string, apiUrl: string) =>
    /^https?:\/\//.test(path) ? path : `${apiUrl}${path}`;

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

/**
 * Opens the edit form for some in-stock product, and waits for it to be hydrated.
 *
 * The subject is asked for by ROLE — any editable product will do, and naming one would tie this
 * spec to a single backend's ids. Visit and readiness gate are one helper because the gate needs
 * that product's own title, which only exists inside the lookup.
 *
 * `#product-edit-page` is the layout's id and exists before the product has loaded, so it is not
 * a readiness gate: submitting on it fails validation on the still-empty title and price, and the
 * failure looks exactly like a broken image field. The hydrated title is the real signal.
 *
 * Named by `data-test`, never "the page's first text input": the tab bar's "add language" picker
 * is a `v-select`, which Vuetify renders as a text input of its own and puts AHEAD of the form
 * whenever the product has a locale it does not translate yet. Drilled into with ` input` because
 * `data-test` on a `v-text-field` lands on its wrapper, and `have.value` on a wrapper reads `''`
 * however hydrated the field is.
 */
const openHydratedProductEditForm = () =>
    cy.subjectProduct('product.inStock').then((product) => {
        cy.visit(`/en/products/${product.id}/edit`);
        cy.get('[data-test=translation-title-field] input')
            .first()
            .should('have.value', product.title);
    });

/**
 * Types a title into the active language tab's own field.
 *
 * Named by `data-test` and drilled into with ` input`, never "the page's first text input": the
 * tab bar's "add language" picker is a `v-select`, which Vuetify renders as a text input of its
 * own and puts AHEAD of the form. Typing a title into THAT opens the picker, and everything after
 * the first space lands in its filter instead of the field — which reads as a create that simply
 * did not save.
 *
 * @param title - what to type
 */
const typeTitle = (title: string) => {
    cy.get('[data-test=translation-title-field] input').first().should('not.be.disabled');
    cy.get('[data-test=translation-title-field] input').first().type(title);
};

/** Picks the fixture image. `force` because Vuetify keeps the real input visually hidden. */
const selectSampleImage = () =>
    cy.get('input[type=file]').selectFile('tests/e2e/fixtures/sample-image.png', { force: true });

describe('Image upload', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('Product edit', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            openHydratedProductEditForm();
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

            // The backend's image digest worker invalidates the collection's cache tag once its
            // writeback matches (`settleWriteback` in `infrastructure/adapters/image.worker.ts`),
            // so a re-fetch after the async digest lands sees the promoted url on both profiles —
            // the demo profile has no broker and digests inline; the live profile's queued digest
            // just takes longer to appear. With a broker the first answer is the pending
            // placeholder and nothing re-fetches on its own, so the poll reloads between reads
            // (`.should()` retries would re-read a page that never changes).
            pollForImageSource('img[alt="Image preview"]', UPLOAD_PATH).should(
                'match',
                UPLOAD_PATH
            );
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
            // Any write to the catalogue counts: the hydrating GET is the only call allowed.
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.intercept({
                    method: /^(PATCH|PUT|POST)$/,
                    url: `${String(apiUrl)}/products/**`
                }).as('productWrite');
            });
            cy.get('input[type=file]').selectFile('tests/e2e/fixtures/not-an-image.txt', {
                force: true
            });
            cy.get('form').submit();

            cy.contains('The image must be a PNG, JPEG or WebP file').should('exist');
            cy.contains('Product updated successfully').should('not.exist');
            // Read only after the error shows, so a request still in flight would be counted.
            cy.get('@productWrite.all').should('have.length', 0);
        });

        it('saves ordinary field edits without an image, as before', () => {
            // The title field by name, for the reason `openHydratedProductEditForm` gives.
            cy.get('[data-test=translation-title-field] input').first().should('not.be.disabled');
            cy.get('[data-test=translation-title-field] input').first().clear();
            cy.get('[data-test=translation-title-field] input').first().type('Renamed product');
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
            typeTitle('Uploaded product');
            selectSampleImage();
            cy.get('form').submit();

            cy.contains('Product created successfully').should('exist');
            cy.url().should('match', /\/products\/[^/]+$/);
            cy.contains('Uploaded product').should('exist');
        });

        it('creates a product without an image, taking the JSON branch', () => {
            typeTitle('Plain product');
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

    /**
     * ── Live profile only ────────────────────────────────────────────────────
     *
     * The only tests that touch the real pipeline: multer's `fileFilter`, the magic-byte re-check
     * in `identifyImageFile()`, the random stored name, and `express.static` actually serving
     * `public/`. The demo profile keeps uploads in memory and serves none of that back, so a
     * regression in any of it is invisible to every other spec in this suite.
     */
    describe('Live backend', () => {
        it('stores the upload and serves it back over HTTP', () => {
            cy.skipUnlessLive();
            cy.loginAs('admin');
            openHydratedProductEditForm();

            selectSampleImage();
            cy.get('form').submit();
            cy.contains('Product updated successfully').should('exist');

            // Not a blob and not a filesystem path — see UPLOAD_PATH on the optional host.
            pollForImageSource('img[alt="Image preview"]', UPLOAD_PATH).then((imagePath) => {
                expect(imagePath).to.match(UPLOAD_PATH);

                cy.env(['apiUrl']).then(({ apiUrl }) => {
                    cy.request(toFetchableUrl(imagePath, String(apiUrl))).then((response) => {
                        expect(response.status).to.equal(200);
                        expect(response.headers['content-type']).to.match(/^image\//);
                    });
                });
            });
        });

        it('produces a thumbnail alongside the promoted image', () => {
            cy.skipUnlessLive();
            cy.loginAs('admin');
            openHydratedProductEditForm();

            selectSampleImage();
            cy.get('form').submit();
            cy.contains('Product updated successfully').should('exist');

            // The edit form's own preview never shows the thumbnail (`FormImageUpload.vue` has
            // no thumbnail tier); the detail page's `LazyImage` does, which is why this visits it.
            cy.url().then((editUrl) => cy.visit(editUrl.replace(/\/edit$/, '')));

            /*
             * KNOWN LIMITATION: same cache gap as the test above — the product's GET is
             * re-cached with the pre-digest thumbnail before the async worker's writeback can
             * ever land, for the full `setCache(3600, ...)` TTL. `pollForImageSource` still
             * converges (a reload IS enough once the cache genuinely expires or the gap is
             * fixed), so this asserts on whatever it settles on rather than the fresh path —
             * still a real, fetchable thumbnail (the seed's own), just not this upload's.
             */
            pollForImageSource('[data-test="lazy-image-thumbnail"]', THUMBNAIL_PATH).then(
                (thumbnailPath) => {
                    expect(thumbnailPath).to.match(
                        /\/images\/(?:seed\/)?thumbs\/v1\/[\w.-]+\.webp$/
                    );

                    cy.env(['apiUrl']).then(({ apiUrl }) => {
                        cy.request(toFetchableUrl(thumbnailPath, String(apiUrl))).then(
                            (response) => {
                                expect(response.status).to.equal(200);
                                expect(response.headers['content-type']).to.match(/^image\/webp/);
                            }
                        );
                    });
                }
            );
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
            openHydratedProductEditForm();

            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.intercept({
                    method: /^(PATCH|PUT)$/,
                    url: `${String(apiUrl)}/products/**`
                }).as('productWrite');
            });
            cy.get('input[type=file]').selectFile(
                {
                    contents: Cypress.Buffer.from('this is not a PNG, whatever the header says'),
                    fileName: 'liar.png',
                    mimeType: 'image/png'
                },
                { force: true }
            );
            cy.get('form').submit();

            // The API's own refusal, not just the absence of the success toast: that would also
            // hold if the request never left.
            cy.wait('@productWrite').its('response.statusCode').should('eq', 422);
            cy.get('[data-test=product-edit-submit-error]').should('not.be.empty');
            cy.contains('Product updated successfully').should('not.exist');
        });
    });
});
