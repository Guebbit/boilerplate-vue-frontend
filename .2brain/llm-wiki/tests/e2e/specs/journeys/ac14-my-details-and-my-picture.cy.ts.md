---
source: tests/e2e/specs/journeys/ac14-my-details-and-my-picture.cy.ts
sha256: 3d4cacac722939a0cd6972d3ae894d25b727b62438c2f0ea1cffe7b3202a3a74
generated_at: 2026-10-17T02:04:52.102241+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac14-my-details-and-my-picture.cy.ts

## Purpose

Cypress E2E journey test for acceptance criterion 14: a customer edits their username, phone, and website on the profile page; uploads and removes an avatar; encounters a 412 conflict when another device saves first; and can discard unsaved input via "reset." It exists to verify the full round-trip of detail editing, image lifecycle, optimistic-concurrency handling, and form reset in one integrated flow.

## Key elements

- **`DETAILS`** — constant holding the username, phone, and website values the test types into the form.
- **`OTHER_DEVICE_USERNAME`** — the value the second device writes, used to assert the "reload latest" path.
- **`AccountLike`** — interface describing the subset of the account record the test reads back (username, phone, website, imageUrl).
- **`setField(testId, value)`** — waits for a `[data-test=…] input` to be enabled, clears it, and optionally types the new value (empty string clears).
- **`saveDetails()`** — clicks the profile form's submit button and waits until it becomes disabled again (form is clean). Deliberately avoids `cy.intercept` on `PATCH /account` to prevent corrupting the avatar's multipart body later in the same test.
- **`accountNow()`** — issues `GET /account` via `cy.apiAs('user', …)` and returns the parsed record.
- **`describe` / single `it`** — one test, sequenced via `cy.step()` calls: save details → reload → clear phone → upload avatar → remove avatar → stale-save conflict (412) → reload-latest → reset form.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `loginDevice` (opens a second real login session for the conflict scenario) and `requestAsDevice` (issues the competing `PATCH /account` from that session).
- **`tests/support/e2e/images.ts`** — provides `pollForImageSource` (waits until an `<img>` element's `src` matches the expected upload path) and `UPLOAD_PATH` (regex/constant identifying server-served upload URLs).
- **`tests/support/e2e/steps.ts`** — provides `eventually` (retries an async assertion until it passes), used to poll the API until the uploaded image path appears in `imageUrl`.

## Notes

- `saveDetails` intentionally does **not** intercept `PATCH /account`; a leftover intercept would buffer the subsequent avatar multipart body and corrupt it.
- The seeded customer already has a picture, so the presence of the "remove" button is **not** a reliable upload-complete signal — the test polls the API (`eventually` + `UPLOAD_PATH`) instead.
- `selectFile` uses `{ force: true }` to bypass file-input visibility constraints.
- The 412 conflict path is only reachable with two real writers; the second device is a full `loginDevice` session, not a mocked request.
- The file declares `requires-module: account`, indicating it depends on the account feature module being available.
