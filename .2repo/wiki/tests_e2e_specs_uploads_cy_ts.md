# tests/e2e/specs/uploads.cy.ts

## Purpose

End-to-end Cypress spec that exercises the image-upload path across the three surfaces that accept a file: product edit, product create, and user create. It verifies the full round-trip (local preview → multipart submit → server-stored URL rendered back) without inspecting the wire directly; instead it asserts on the consequence (the `<img src>` becomes an API-served path) so the test is transport-agnostic.

## Key elements

- **`UPLOAD_PATH`** / **`THUMBNAIL_PATH`** – Regexes matching the server-returned image and thumbnail URLs (optional absolute origin + `/images/…` path). Used to assert a successful upload rendered in the DOM.
- **`toFetchableUrl(path, apiUrl)`** – Normalises a possibly-relative image path to an absolute URL; guards against double-prefixing when `resolveImageUrl` already added the origin.
- **`DIGEST_TIMEOUT_MS` / `DIGEST_POLL_INTERVAL_MS`** – Bounded wait constants for the asynchronous image-digest worker (RabbitMQ broker).
- **`pollForImageSource(selector, pattern, deadline)`** – Recursively re-reads an `<img>`'s `src` with `cy.reload()` between reads until it matches a regex or the deadline expires. Needed because the digest runs off-request and neither app pushes the update.
- **`expectNoPendingLocalPreview()`** – Asserts no `blob:` URL lingers in any preview `<img>`, proving no locally-picked file is stuck in the form.
- **`openHydratedProductEditForm()`** – Picks any in-stock product by role, visits its edit page, and gates on the hydrated title appearing (not just the layout container).
- **`selectSampleImage()`** – Drives the hidden file input with `cy.selectFile` (`force: true` to bypass Vuetify's visual hiding).
- **`describe('Image upload')`** – Three sub-suites: *Product edit* (accept-attr, instant preview, full upload round-trip, file cleanup, wrong-type rejection, no-image edit), *Product create* (route disambiguation, create-with-image, create-without-image, validation), *User create* (truncated in source).

## Relationships

No graph neighbors recorded.

## Notes

- **Assertion strategy**: The spec deliberately avoids `cy.intercept` for the multipart check. It asserts the *outcome* (server path in `src`) rather than the request shape, so it works regardless of transport changes.
- **Digest polling**: Without a broker the first DOM read already matches and `pollForImageSource` returns immediately. With a broker, the page must be reloaded between reads because neither app client-pushes the update.
- **Known cache limitation (live profile only)**: `invalidateCache(['products'])` fires *before* the upload middleware, so the next GET re-caches the pre-digest placeholder for the full 3600 s TTL. The test asserts per-profile (`cy.env('liveProfile')`) rather than dropping coverage.
- **`force: true` on `selectFile`**: Vuetify keeps the native `<input type="file">` visually hidden; without `force` Cypress refuses to interact.
- **Readiness gate**: `#product-edit-page` exists before data loads, so it is *not* used as a hydration signal. The hydrated title text is the real gate; submitting on the unhydrated form produces a validation error that looks like a broken image field.
- **Profile-agnostic seeding**: Under the live profile a seeded product already has an `imageUrl`; assertions are written as "no `blob:` URL present" rather than "no image present" so both profiles pass.
