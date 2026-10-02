---
source: src/modules/products/tests/e2e/uploads.cy.ts
sha256: ce8730b0dc98d5e6e709dfc2ccb352055a9dcb0c1c7e75d8a4dbe03c9fa0dc31
generated_at: 2026-10-02T15:34:27.830087+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/uploads.cy.ts

## Purpose

Cypress e2e spec that exercises the product image-upload path (shared `FormImageUpload.vue` → `multer` → digest/thumbnail worker) through the product create and edit forms specifically. Extracted from the central `tests/e2e/specs/uploads.cy.ts` under FA122 so the catalogue module owns its upload coverage; the central file retains only the generic "User create"/"Signup" cases.

## Key elements

- **`THUMBNAIL_PATH`** – Regex matching the thumbnail sibling of `UPLOAD_PATH` (optional API-host prefix + `/images/thumbs/v1/<name>.webp`).
- **`toFetchableUrl(path, apiUrl)`** – Prepends `apiUrl` only when `path` is not already an absolute URL, preventing a doubled-origin 404.
- **`expectNoPendingLocalPreview()`** – Asserts no `<img alt="Image preview">` still carries a `blob:` src (i.e. no locally-picked file is pending upload).
- **`openHydratedProductEditForm()`** – Looks up an in-stock product via `cy.subjectProduct`, visits its edit route, and gates on the hydrated title in `[data-test=translation-title-field] input`.
- **`typeTitle(title)`** – Types into the same `data-test` selector; guards that the field is enabled first.
- **`selectSampleImage()`** – Calls `selectFile` on the hidden file input with `{ force: true }`.
- **`describe('Product edit')`** – Six tests: accepted MIME types, instant local preview, full upload + render, blob release post-upload, wrong-type rejection without an API write, and a no-image save regression check.
- **`describe('Product create')`** – Four tests: route reachability, create-with-image, create-without-image (JSON branch), and titleless-submit validation.
- **`describe('Live backend')`** – Live-profile-only test confirming multer, magic-byte re-check, random stored name, and `express.static` all work end-to-end.

## Relationships

- **`tests/support/e2e/images.ts`** – Imports `pollForImageSource` (reloads the page between reads to wait for the async digest worker) and `UPLOAD_PATH` (the expected server-side image URL pattern) used in assertions after upload.

## Notes

- Multipart success is asserted **by consequence** (preview `src` becomes a server path), not via `cy.intercept`, so the check survives transport changes.
- All form-field selectors use `data-test` + ` input` drill-in. Selecting "the first text input" would hit Vuetify's `v-select` language picker, which renders a text input ahead of the form.
- `#product-edit-page` is the layout container id and exists before hydration; it must **not** be used as a readiness gate.
- `selectFile` requires `{ force: true }` because Vuetify visually hides the native file input.
- The upload-and-render test uses `pollForImageSource` (page reload between reads) rather than a plain `.should()` retry, because under the live profile the digest is queued and the page content does not change until the worker invalidates the cache tag.
- The "Live backend" describe block is the only part that touches the real file pipeline (multer filter, `identifyImageFile`, `express.static`); the demo profile keeps uploads in memory, so regressions there are invisible to every other spec.
