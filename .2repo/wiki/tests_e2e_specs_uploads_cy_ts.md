# tests/e2e/specs/uploads.cy.ts

## Purpose

Cypress end-to-end spec that verifies the full image-upload flow across every form in the app (product edit, product create, user create, signup). It asserts on the *consequence* of a multipart request — a server-returned `/images/<uuid>.<ext>` path appearing in the preview's `src` — rather than intercepting the request itself, so the assertions stay valid regardless of transport details.

## Key elements

- **`UPLOAD_PATH`** (const regex) — Matches the server-relative or absolute path the API returns for a stored image (`/images/<32-hex>.<ext>`). Used as the expected `src` after a successful upload.
- **`expectNoPendingLocalPreview()`** — Scans all `img[alt="Image preview"]` elements and asserts none have a `blob:` src. Distinguishes "a local file is awaiting upload" from "a seeded product already has a server image."
- **`openHydratedProductEditForm()`** — Resolves a product by role (`inStock`), navigates to its edit page, and gates on the hydrated title text (not the `#product-edit-page` id, which exists before data loads).
- **`selectSampleImage()`** — Calls `selectFile` on the hidden Vuetify file input with `{ force: true }` using `tests/e2e/fixtures/sample-image.png`.
- **`describe('Product edit')`** — Tests the `accept` attribute, immediate blob preview, full upload → `imageUrl` render, blob-URL cleanup, wrong-type rejection (no API call), and plain field save without an image.
- **`describe('Product create')`** — Verifies the route is not swallowed by `/products/:id`, creates with/without an image, and checks validation on an empty title.
- **`describe('User create')`** — Covers the `createUserWithMultipart` branch with an avatar.
- **`describe('Signup')`** — Covers the store method that historically lacked a multipart branch; confirms a profile image survives registration.
- **`describe('Live backend')`** (gated by `cy.skipUnlessLive()`) — Exercises the real server pipeline: multer `fileFilter`, magic-byte re-check in `identifyImageFile()`, random filename generation, and `express.static` serving from `public/`.

## Relationships

No graph neighbors are recorded for this file. It is a leaf spec that consumes the app under test via HTTP and depends only on the Cypress fixture `tests/e2e/fixtures/sample-image.png` (and `not-an-image.txt` for the negative case).

## Notes

- **No `cy.intercept`.** The suite deliberately avoids request-level assertions; correctness is inferred from the DOM state (preview `src`) after submit.
- **`force: true` on `selectFile`** is required because Vuetify visually hides the native `<input type="file">` behind a styled label; without it the upload silently no-ops.
- **Blob vs. server URL is the core invariant.** A `blob:` src means "picked but not uploaded." A seeded product may legitimately show a server image before any user action, so "no image" assertions are wrong; "no blob" is the correct check.
- **`#product-edit-page` is not a readiness gate.** The id exists before data hydrates; gating on it leads to submit-against-empty-field failures that look like image bugs. The hydrated `<input type="text">` value is the real signal.
- **Demo profile is a real multipart write.** The comment clarifies that even in the demo profile, a string where a `File` part is expected yields a 422, so the suite never silently tests the JSON branch unless that branch is the intent.
- **Live-backend block is the only place** the real filesystem/multer/`express.static` path is exercised. A regression in any of those layers is invisible to every other test in this file.
