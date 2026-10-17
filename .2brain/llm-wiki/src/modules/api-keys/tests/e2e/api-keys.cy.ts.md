---
source: src/modules/api-keys/tests/e2e/api-keys.cy.ts
sha256: 81a3d00091bb6a3301f48ea1a6642f4caca2316880b1bdaf6a00818f814735e4
generated_at: 2026-10-17T00:32:10.647694+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/e2e/api-keys.cy.ts

## Purpose

Cypress end-to-end spec that exercises the functional mint-and-revoke flow of the admin-only API keys module against the running app. It covers the list page and the full create → secret-reveal → revoke lifecycle; the accessibility sweep lives in a separate spec.

## Key elements

- **`unique()`** — returns a `${Date.now()}-${random}` string so concurrent spec runs don't collide on the same credential name.
- **`weekAhead()`** — returns an ISO `datetime-local` string (first 16 chars) set one week in the future, satisfying the mint form's required expiry field.
- **`describe('API keys')`** — top-level suite; `beforeEach` visits `/en`, restores a clean backend fixture (`cy.restore()`), and logs in as `admin`.
- **`describe('List')`** — two assertions: the page renders its `#api-keys-list-page` landmark with an "API keys" `<h1>`, and an admin sees a "New credential" link/button.
- **`describe('Mint and revoke')`** — single integration test that:
  - fills the create form (`[data-test=api-key-name]`, `[data-test=api-key-permissions]` with `display:Product`, `[data-test=api-key-expires-at]`) and submits.
  - asserts the one-time secret-reveal modal (`[data-test=secret-reveal]`) is visible, captures the value, clicks confirm-saved then continue.
  - verifies the success toast and the new row appears (bumping page size to 50 first, since the list has no search).
  - clicks `[data-test=row-revoke]`, confirms in `app-dialog-confirm`, then asserts the revoke button is now disabled.

## Relationships

No graph neighbors are recorded for this file. It is a leaf spec that talks to the app purely through the DOM (Cypress selectors) and the backend only implicitly via `cy.restore()` / `cy.loginAs()`.

## Notes

- `cy.restore()` in `beforeEach` implies a seeded-fixture backend; tests assume a clean state per run rather than cleaning up after themselves.
- The list page has no search/filter, so the test must inflate the page size to 50 to guarantee the freshly minted row is visible. This is brittle if the fixture seed grows.
- The permissions field is filled by typing `display:Product{enter}` — it's a tag/combo input, not a plain text field.
- The secret is asserted to be non-empty (`/\S+/`) but its exact format is not validated here; the "shown exactly once" guarantee is tested by the UI flow (confirm → continue → redirect), not by a second fetch.
- Selectors throughout are `[data-test=…]` attributes, not class names or text — keep those attributes stable when modifying the component.
