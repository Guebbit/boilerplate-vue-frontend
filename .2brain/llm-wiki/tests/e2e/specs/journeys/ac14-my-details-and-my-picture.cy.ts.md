---
source: tests/e2e/specs/journeys/ac14-my-details-and-my-picture.cy.ts
sha256: 3d4cacac722939a0cd6972d3ae894d25b727b62438c2f0ea1cffe7b3202a3a74
signature: 126f4075df6e04b2765bbe8db9706ab88db11f110b336db136fb7a6c6a9ac48c
generated_at: 2026-11-10T06:45:25.312662+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac14-my-details-and-my-picture.cy.ts

## Purpose

Cypress e2e test for the "My details and my picture" journey (AC14). Verifies that a customer can edit username, phone, and website; that cleared fields persist as `null` rather than empty strings; that an uploaded avatar survives a reload and can be removed back to a placeholder; that a stale save (another device wrote first) is rejected with HTTP 412 and the latest record is offered; and that "reset" discards unsaved input.

## Key elements

- **`DETAILS`** — literal values typed into the form (username, phone, website) so assertions can reference them directly.
- **`OTHER_DEVICE_USERNAME`** — the username the second device writes, used to verify the 412 conflict path.
- **`AccountLike`** — minimal shape of the `/account` record the test reads (username, phone, website, imageUrl).
- **`setField(testId, value)`** — waits for the input to be enabled, clears it, and types the value (or clears when `''`).
- **`saveDetails()`** — clicks the profile form's submit button and waits until the button is re-disabled (form clean). Deliberately avoids `cy.intercept` on PATCH.
- **`accountNow()`** — fetches the current `/account` record via `cy.apiAs('user', 'GET', '/account')`.
- **`describe('AC14 …')`** — single test case that walks through all six sub-steps sequentially in one browser session.

## Relationships

- **`tests/support/e2e/harness.ts`** — `loginDevice` creates a second authenticated session; `requestAsDevice` issues the competing `PATCH /account` that triggers the 412.
- **`tests/support/e2e/images.ts`** — `UPLOAD_PATH` (regex) is used to assert the stored `imageUrl` and the rendered `<img>` source point to the upload endpoint; `pollForImageSource` waits for the preview image to resolve after a reload.
- **`tests/support/e2e/steps.ts`** — `eventually` polls `accountNow` until the upload has landed in the API, avoiding a fixed timeout.

## Notes

- `saveDetails` intentionally does **not** use `cy.intercept('PATCH', …)` because an intercept left active would buffer the binary multipart body of the later avatar upload and corrupt it.
- Avatar-upload completion is detected via the API (`account.imageUrl` matching `UPLOAD_PATH`), not via the UI, because the seeded account already has a picture and the remove button's presence is ambiguous.
- The 412 conflict test is the only place a real `cy.intercept` on PATCH appears; it is scoped to that single assertion and does not overlap with the avatar upload.
- The `requires-module: account` comment at the top indicates this spec depends on the `account` feature module being present in the build.
