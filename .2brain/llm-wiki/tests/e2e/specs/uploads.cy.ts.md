---
source: tests/e2e/specs/uploads.cy.ts
sha256: fc49621c48b907539a5461713984816e099d18051898376bbc085e906ae86c2a
generated_at: 2026-10-17T02:23:49.615426+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/uploads.cy.ts

## Purpose

E2E tests that exercise image-upload through the two flows that ship with every deployment regardless of catalogue: **User create** (admin creates a user with an avatar) and **Signup** (new account + follow-up avatar PATCH). Product-form upload tests were extracted to `src/modules/products/tests/e2e/uploads.cy.ts`, leaving only these foundation-level cases here.

## Key elements

- **`selectSampleImage()`** — local helper that calls `.selectFile(...)` with `{ force: true }` because Vuetify visually hides the real `<input type=file>`.
- **`describe('User create')`** — logs in as admin, navigates to `/en/users/create`, fills email + name, attaches `tests/e2e/fixtures/sample-image.png`, submits, then asserts the avatar's `src` matches `UPLOAD_PATH` via `pollForImageSource`.
- **`describe('Signup')`** — fills the public signup form, attaches the same fixture, submits. After redirect to the home page, visits `/en/profile` and polls for the avatar preview's `src` to equal `UPLOAD_PATH` (proving the separate follow-up `PATCH /account` actually carried the file).

## Relationships

- **`tests/support/e2e/images.ts`** — provides `pollForImageSource` (retries until an `<img>`'s `src` settles) and the `UPLOAD_PATH` constant used to assert the server-stored file path appears in the rendered preview.

## Notes

- **Assertion strategy:** The file deliberately avoids `cy.intercept` to verify multipart transport. Instead it asserts on the *outcome*—the API only returns a server path when a `File` part arrived, so a preview whose `src` equals `UPLOAD_PATH` is proof the body was multipart and the file survived. This keeps tests transport-agnostic.
- **Signup is two requests:** `POST /account/signup` takes no file; the avatar goes in a subsequent `PATCH /account`. The test's real risk is that follow-up being silently skipped, which is why it navigates to `/en/profile` and checks the avatar preview rather than just confirming the signup redirect.
- **`force: true` on file input and checkbox:** Required because Vuetify renders these with hidden/native elements that don't pass standard visibility checks.
- **`beforeEach` calls `cy.visit('/en')` then `cy.restore()`**, establishing a clean state for each spec.
