---
source: src/modules/webhooks/tests/e2e/actions.cy.ts
sha256: 94ce506765d0f521165b9eb9eadce865b5251130c3b74c830134f734a959cbdf
signature: cc10da89ff0d22b1d8a26d9bc00d2da87c96f8345b47aa669607c8621dee0344
generated_at: 2026-11-10T06:14:26.329997+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/e2e/actions.cy.ts

## Purpose

End-to-end resilience specs for the webhooks module. Each scenario forces a server fault on a real form/row action (create, edit, delete, slow read) and asserts that the UI shows the expected alert, preserves user input, and succeeds on retry. The file is a pure test registration module — it has no exports of its own.

## Key elements

- **`unique()`** — local helper that returns a timestamp-and-random suffix, used to build non-colliding webhook names when two specs hit the same backend.
- **`actionTable('webhooks', [...])`** — the single top-level call. Registers four scenario objects with the shared runner:
  - *create failure* — types URL, description, and event picker; submits; expects `webhook-create-error` alert.
  - *edit failure* — pre-creates a subscription, types a description on the edit form; submits; expects `webhook-edit-form-error` alert.
  - *delete failure* — pre-creates a subscription, clicks row delete + confirm; expects `webhooks-list-row-action-error` alert and the row to remain.
  - *slow record read* — navigates to the edit page with the GET stubbed slow; asserts the form stays closed until the record lands and typed values survive a refetch.
- Each scenario specifies `persona: 'admin'`, a `route` (string or async), `trigger`, `intercept` (method / url pattern / OpenAPI operation id), `kind` (`form` | `row` | `slow`), the `alert` message id, and a human-readable `message`.

## Relationships

- **`tests/support/e2e/action-table.ts`** — provides the `actionTable` runner that interprets each scenario object (routes, stubs the intercept, types values, asserts the alert, then un-stubs and re-triggers for the retry assertion).
- **`tests/support/e2e/integrator.ts`** — provides `sinkEndpoint`, an integration-test helper that registers a one-shot webhook sink URL with the backend and returns it for typing into the form.

## Notes

- The `prepare` block for the create scenario explicitly waits for the event-type listbox to close (`cy.get('[role=listbox]').should('not.exist')`). The runner snapshots all visible inputs as "typed values"; a still-animating listbox would be misread as form input.
- Routes that need a pre-existing subscription (edit, delete, slow-read) are **async functions** returning the URL; the `actionTable` runner awaits them before visiting.
- All scenarios target the `admin` persona, so non-admin access paths are intentionally out of scope here.
- The `intercept.operation` field mirrors the OpenAPI operation id, which the runner uses to match the correct stub even when URL patterns overlap (e.g., `GET` vs `PATCH` on `**/webhooks/subscriptions/*`).
