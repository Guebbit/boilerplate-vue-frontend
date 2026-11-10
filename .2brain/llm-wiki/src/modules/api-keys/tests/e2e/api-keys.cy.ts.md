---
source: src/modules/api-keys/tests/e2e/api-keys.cy.ts
sha256: 1147127c79a408e9fa088527d6b5879665273e6b794257f00c92f75e18d0d1cc
signature: 5c48990f214a1bb757af8e478844cf63fea73252f8e5980f8ca142f4c70b5544
generated_at: 2026-11-10T03:50:54.360380+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/e2e/api-keys.cy.ts

## Purpose

Cypress end-to-end spec for the admin-only API keys module. It verifies the functional mint/revoke lifecycle (create a credential through the real form, confirm the one-time secret reveal, then revoke it) and the basic list-page rendering. Accessibility coverage lives in a separate spec.

## Key elements

- **`unique()`** – Returns a `${Date.now()}-${random}` string so two specs hitting the same backend concurrently cannot collide on a credential name.
- **`weekAhead()`** – Produces a `datetime-local` string (ISO, first 16 chars) one week in the future; satisfies the mint form's required expiry field.
- **`describe('API keys')`** – Top-level suite. `beforeEach` visits `/en`, calls `cy.restore()`, and logs in as `admin`.
  - **`describe('List')`** – Navigates to `/en/api-keys`; asserts the page title (`h1` contains "API keys") and the presence of a "New credential" link/button.
  - **`describe('Mint and revoke')`** – Single integration test:
    1. Fills the create form (`[data-test=api-key-name]`, `[data-test=api-key-permissions]`, `[data-test=api-key-expires-at]`) and submits.
    2. Verifies the one-time secret-reveal modal is visible, contains a non-empty value, and can be dismissed.
    3. Confirms redirect back to the list and a "Credential minted" toast.
    4. Bumps page size to 50, finds the new row by name, clicks revoke, confirms the dialog.
    5. Asserts the revoked row no longer contains a `[data-test=row-revoke]` element.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The list page has **no built-in search**, so the test sets the page size to 50 to guarantee the freshly minted credential appears on the single fetched page.
- After revocation the row is asserted with `should('not.exist')` on the revoke button (not merely `disabled`)—the UI removes the button entirely for revoked credentials.
- `cy.restore()` in `beforeEach` implies a database or state fixture is reset between tests; the `unique()` helper is still used as a belt-and-suspenders guard against parallel spec runs.
- The permissions field is typed with an explicit `{enter}` to trigger the tag/autocomplete widget.
