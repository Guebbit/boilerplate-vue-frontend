---
source: tests/support/e2e/action-table.ts
sha256: f6dc5647bc6dd51a9d829212cf95539912a7ed938f3b66d2eca865c264cee61a
signature: 915d75f94be02466b9d6792ed93ab46d26387546b85f38bf07321a29a8adf532
generated_at: 2026-11-10T07:27:00.875212+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/action-table.ts

## Purpose

A table-driven Cypress runner for single-control E2E scenarios where a UI action is answered with a failure envelope or an empty list. Unlike journey tests (one story per file), each row here is one control with no narrative arc; rows are defined per-module and executed by this shared runner. Supports six action kinds (`form`, `dialog`, `row`, `read`, `empty`, `slow`) and an optional design-capture mode that photographs the loading and terminal states instead of asserting them.

## Key elements

- **`ActionKind`** — union type: `'form' | 'dialog' | 'row' | 'read' | 'empty' | 'slow'`; selects which runner path executes.
- **`ActionIntercept`** — describes the request to stub: HTTP `method`, a `cy.intercept` `url` pattern, and the OpenAPI `operation` path used for contract status checking.
- **`BodySchema`** — minimal `{ parse }` shape (Zod-compatible) used to validate `emptyBody` before it is served.
- **`ActionRow`** — the main data structure: one control + the answer it receives. Fields include `persona`, `route`, `prepare`, `trigger`, `intercept`, `kind`, optional `status`/`code`/`message`, selectors for alert/control/dialog/row, `valuesNotCompared`, `emptyBody`/`emptySchema`/`empty`, and `field`/`typed` for slow reads.
- **`apiRequest()`** — builds the intercept matcher, always scoping to `resourceType: 'xhr'` so the app's own page route is never stubbed.
- **`typedValues()`** — snapshots all `input`/`textarea` values in document order.
- **`stubFailure()`** — registers a `cy.intercept` that answers with `rejectEnvelope(status, code, message)`.
- **`passThrough()`** — registers a counting pass-through intercept for the retry assertion.
- **`expectFailureHandled()`** — asserts alert visible with correct text, URL unchanged, typed values preserved (unless `valuesNotCompared`), dialog/row still present, control re-enabled.
- **`expectRetryWorks()`** — removes stub, re-triggers, asserts exactly one 2xx response and alert gone.
- **`runActionFailure()`** — orchestrates the `form`/`dialog`/`row` flow: visit → prepare → stub → trigger → assert → retry.
- **`runReadFailure()`** — orchestrates the `read` flow: stub before visit, assert alert + spinner dismissal, then reload with pass-through and verify page renders.
- **`runEmpty()`** — orchestrates the `empty` flow: serve schema-checked empty body as 200, assert copy visible, rows/pager absent, CTA navigates.
- **`runSlowRead()`** — orchestrates the `slow` flow: delay the page's own record read, verify typing is refused until record arrives and that a refetch does not clobber typed values. *(File content truncated here.)*

## Relationships

- **`scripts/audit/design-manual/scripts/capture-matrix.ts`** — directly imports `expandActionRows` (turns a row into one or more `PlannedActionShot` for design-capture mode) and the `PlannedActionShot` type.
- **Module `actions.cy.ts` files** (account, api-keys, cart, delivery, example, inventory, locales, orders, payments, products, returns, stats, stock-alerts) — each module defines its own `ActionRow[]` and invokes this runner; this file is the shared executor, analogous to how `sweepA11y` runs per-module routes.
- **`contracts/rest/error-codes.ts`** — this file imports the `ErrorCode` type (via `./envelope`), which is defined in the REST error-code contract; it is used as the type for `ActionRow.code` and for the `DEFAULT_CODE` constant.

## Notes

- **JWT-only by design.** A stubbed response never reaches the session/cookie layer, so the cookie auth leg would exercise identical code with no added coverage.
- **`resourceType: 'xhr'` is load-bearing.** A path like `/orders` is both the app's page and its API endpoint; without the XHR filter a bare URL pattern would stub navigation into a JSON blob.
- **`valuesNotCompared` is a documented escape hatch.** Use it when an autocomplete or similar control rewrites the raw `input` text on blur; the underlying value is still preserved.
- **`emptyBody` is validated before serving.** If `emptySchema` is provided, `parse` is called synchronously; a throw fails the test before the browser ever sees the response.
- **Design-capture mode** (`E2E_DESIGN_CAPTURE=true`) reuses the same rows but photographs instead of asserting; shot expansion is delegated to `expandActionRows` from the capture-matrix script.
