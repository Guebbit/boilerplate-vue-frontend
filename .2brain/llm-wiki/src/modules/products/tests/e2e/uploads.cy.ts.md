---
source: src/modules/products/tests/e2e/uploads.cy.ts
sha256: c7f755986363706ed9a03f7d0fac1dbe26ad5530fe0519491028370c56e01809
signature: b7ad51bb03f50ce24f1aa04f2d57d1205d82e6e0a89bf4ebae4431de168b486f
generated_at: 2026-11-10T05:24:21.162644+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/uploads.cy.ts

## Purpose

Cypress e2e spec covering image upload through the product forms (edit, create) and the live-backend storage/serving pipeline. It lives in the products module rather than the central `tests/e2e/specs/uploads.cy.ts` because it exercises the shared upload mechanism (`FormImageUpload.vue`, `multer`, the digest/thumbnail worker) specifically through a product form, and the "Live backend" block reuses the hydrated edit form.

## Key elements

- **`THUMBNAIL_PATH`** – Regex matching the thumbnail sibling of `UPLOAD_PATH` (e.g. `/images/thumbs/v1/<name>.webp`), optionally prefixed with an API host.
- **`toFetchableUrl(path, apiUrl)`** – Returns `path` as-is if already absolute; otherwise prepends `apiUrl`. Prevents a doubled origin that would 404.
- **`expectNoPendingLocalPreview()`** – Asserts no `<img[alt="Image preview"]>` carries a `blob:` src. Deliberately checks for absence of blob URLs rather than absence of an image, because a seeded product may legitimately show a server image.
- **`openHydratedProductEditForm()`** – Looks up any in-stock product by role (`cy.subjectProduct`), visits its edit route, and gates on the hydrated title appearing in `[data-test=translation-title-field] input`.
- **`typeTitle(title)`** – Types into the same `data-test` field, asserting it is enabled first.
- **`selectSampleImage()`** – Selects `tests/e2e/fixtures/sample-image.png` on the hidden file input (with `{ force: true }` for Vuetify's visual hiding).
- **`describe('Product edit')`** – Five tests: accept-attribute correctness, immediate blob preview, full upload→imageUrl render, local-file cleanup after upload, client-side type rejection without API call, and ordinary save without an image.
- **`describe('Product create')`** – Four tests: route disambiguation from `products/:id`, create-with-image, create-without-image (JSON branch), and titleless-submit validation.
- **`describe('Live backend')`** – Profile-gated test(s) that verify `multer` fileFilter, magic-byte re-check, random stored name, and `express.static` serving from `public/`.

## Relationships

- **`tests/support/e2e/images.ts`** – Imports `pollForImageSource` (retry loop that re-requests the page until the image src matches, needed because the async digest worker's writeback is not reflected by a simple `.should()` re-read) and `UPLOAD_PATH` (regex for the served image URL). `THUMBNAIL_PATH` in this file mirrors the same optional-host-prefix pattern defined alongside `UPLOAD_PATH` there.

## Notes

- **Selecting form fields:** Always use `[data-test=translation-title-field] input` and drill into `input`. The page's first text input is actually the "add language" `v-select` picker rendered by Vuetify ahead of the form; typing into it opens the picker and swallows input after the first space.
- **Readiness gate:** `#product-edit-page` exists before hydration and is not a valid gate. The hydrated title value is the real signal; submitting on an unhydrated form fails validation identically to a broken image field.
- **Multipart assertion strategy:** The spec does not use `cy.intercept` to prove the body was multipart. Instead it asserts the consequence—the API returns a server path and the preview `src` becomes that path—which is transport-agnostic.
- **Polling vs. `.should()`:** After upload, the digest worker's writeback is asynchronous. `pollForImageSource` reloads the page between reads because `.should()` retries only re-query the DOM of a page that never changes on its own.
- **Demo vs. live profile:** The demo profile keeps uploads in memory and digests inline; the live profile uses a broker and queued digests. Most tests pass on both; the "Live backend" block is `cy.skipUnless`-gated to the live profile only.
- **Blob-URL check vs. existence check:** A seeded product legitimately has an image. Tests assert "no `blob:` src" (nothing locally picked is pending) rather than "no image element," so they hold on both profiles.
