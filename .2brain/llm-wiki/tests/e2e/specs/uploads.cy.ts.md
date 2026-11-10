---
source: tests/e2e/specs/uploads.cy.ts
sha256: fc49621c48b907539a5461713984816e099d18051898376bbc085e906ae86c2a
signature: fcc3128344ac27481fbbafb995a5556c3164c65e8c65d23c1844c06c13a9b6bc
generated_at: 2026-11-10T07:25:28.172805+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/uploads.cy.ts

## Purpose

End-to-end tests for the two image-upload flows that exist in every deployment regardless of whether the shop module is present: **User create** (avatar via `createUserWithMultipart`) and **Signup** (avatar as a follow-up `PATCH /account`). Product-form upload tests were moved out of this file (to `src/modules/products/tests/e2e/uploads.cy.ts`) so this spec can run against a minimal build.

## Key elements

- **`selectSampleImage()`** — Local helper that selects `tests/e2e/fixtures/sample-image.png` into the hidden Vuetify `input[type=file]` (uses `{ force: true }` to bypass the visual-hidden wrapper).
- **`describe('User create')`** — Logs in as admin, fills the `/en/users/create` form (email, display name, avatar), submits, and asserts the success toast, redirect to `/users/…`, and that the lazy-image `src` matches `UPLOAD_PATH`.
- **`describe('Signup')`** — Fills `/en/signup` (email, password × 2, avatar, terms checkbox), submits, asserts the user lands on `#home-page`, then navigates to `/en/profile` and verifies the avatar preview `img[alt="Image preview"]` resolves to `UPLOAD_PATH`.
- **`beforeEach`** — Visits `/en` and calls `cy.restore()` to reset seeded state before each test.

## Relationships

- **`tests/support/e2e/images.ts`** — Supplies `pollForImageSource` (retries until a given selector's `src` stabilises) and the `UPLOAD_PATH` constant used in both tests' final assertions. This is the only external dependency of the spec.

## Notes

- Multipart success is asserted **on the consequence** (the rendered `<img src>` equals the server-stored path), not via `cy.intercept`. This keeps the assertion transport-agnostic.
- The Signup flow sends the avatar as a **separate follow-up request** (`PATCH /account`) after `POST /account/signup`; the test explicitly navigates to the profile page to catch a silently-dropped follow-up, since the landing page alone would not reveal the failure.
- `force: true` is required on `selectFile` and the terms-checkbox `.check()` because Vuetify wraps the native inputs in a visually-hidden element.
- The file deliberately avoids any dependency on the products/catalogue module; it is safe to run against a build that ships only the user/account foundation.
