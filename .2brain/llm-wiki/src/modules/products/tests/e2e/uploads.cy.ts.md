---
source: src/modules/products/tests/e2e/uploads.cy.ts
sha256: d719f59d18b6e77a4e443c1580e9c551a94752bf27b00f80b32cb12520eb3a40
generated_at: 2026-10-17T01:29:58.147100+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/uploads.cy.ts

## Purpose

End-to-end spec for image upload exercised through the product catalogue's own forms (edit and create). Extracted from the central `tests/e2e/specs/uploads.cy.ts` so that product-specific upload coverage lives with the module; the central file retains only the user-facing ("User create", "Signup") cases that must pass on a build with no catalogue at all.

## Key elements

- **`THUMBNAIL_PATH`** — regex matching the API's thumbnail URL pattern (`/images/thumbs/v1/<name>.webp`), used to assert thumbnail rendering.
- **`toFetchableUrl(path, apiUrl)`** — returns `path` unchanged if already absolute, otherwise prepends `apiUrl`. Prevents a doubled-origin 404.
- **`expectNoPendingLocalPreview()`** — asserts no `<img>` with `alt="Image preview"` carries a `blob:` src. Deliberately checks "no blob URL" rather than "no image", because a seeded product legitimately shows a server image.
- **`openHydratedProductEditForm()`** — resolves an in-stock product by role via `cy.subjectProduct('product.inStock')`, visits its edit URL, and gates on the translated title field actually holding the product's title (not on `#product-edit-page`, which exists pre-hydration).
- **`typeTitle(title)`** — types into `[data-test=translation-title-field] input` (drilled past the Vuetify wrapper). Avoids "first text input" to prevent hitting the locale picker's hidden `<input>`.
- **`selectSampleImage()`** — selects `tests/e2e/fixtures/sample-image.png` with `{ force: true }` (Vuetify hides the real file input).
- **`describe('Product edit')`** — covers: `accept` attribute correctness, immediate blob-URL preview, full upload round-trip (submit → server path in preview), local-file cleanup after upload, client-side type rejection without any API write, and a no-image field edit.
- **`describe('Product create')`** — covers: route distinctness from `products/:id`, create-with-image (navigates to detail page), create-without-image (JSON branch), and titleless-submit validation.
- **`describe('Live backend')`** — profile-gated tests (via `cy.skipUnlessL…`) that exercise the real pipeline: `multer` fileFilter, magic-byte re-check, random stored name, and `express.static` serving `public/`. Inactive under the demo profile.

## Relationships

- **`tests/support/e2e/images.ts`** (imported) — provides `pollForImageSource` (reloads the page between reads until the image src matches, working around the digest worker's async cache invalidation) and `UPLOAD_PATH` (regex for the API's uploaded-image URL). Both are used in the "uploads the image and renders the imageUrl" test and available to any spec that needs the same polling helper.
- **`tests/e2e/specs/uploads.cy.ts`** (sibling, same concern) — retains the catalogue-independent upload cases; this file's docblock explains the split rationale.
- **`tests/e2e/fixtures/sample-image.png` / `not-an-image.txt`** — fixture files selected by `selectFile`.
- **`infrastructure/adapters/image.worker.ts`** (`settleWriteback`) — the backend cache-invalidation mechanism the polling test waits on; not imported here but the test's retry strategy is shaped by it.

## Notes

- **Selector discipline:** Every text-input interaction uses `[data-test=…]-field input` drilled one level. Vuetify's `v-select` (the "add language" picker) renders its own `<input>` *before* the form in the DOM; selecting "first text input" types into the picker's filter and the test silently fails or saves the wrong value.
- **Multipart assertion strategy:** The spec never uses `cy.intercept` to verify the body was multipart. Instead it asserts the *consequence* — the API's stored-path appears as the preview `src`. This is transport-agnostic and keeps the test valid across demo (inline digest) and live (queued digest) profiles.
- **`selectFile` + `force`:** Vuetify keeps the native `<input type="file">` visually hidden; `force: true` is required or the command times out.
- **`expectNoPendingLocalPreview` vs. absence of image:** A seeded product already has an `imageUrl`; the form correctly shows it. Only a `blob:` src indicates an un-uploaded local file. Tests that must pass on *both* profiles use this helper rather than asserting the image element is absent.
- **Live-backend gating:** The `describe('Live backend')` block is the only suite that touches `multer`, magic-byte validation, random naming, and static serving. Under the demo profile (in-memory, no broker) those code paths are unreachable, so regressions there are invisible to every other test in this file.
