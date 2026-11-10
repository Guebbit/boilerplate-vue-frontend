---
source: tests/support/e2e/envelope.ts
sha256: 70c6ce841444f37a61148fb6feb269d104a9fe5c964c2ac38a84514d57e9b340
signature: 443ee81d3178de3029bce4dd4582528e465afbf7a5b0d4b5cf0b53b14feca24c
generated_at: 2026-11-10T07:29:30.112722+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/envelope.ts

## Purpose

Test-support helper that validates a stubbed response status is actually declared in the OpenAPI contract before allowing the stub to exercise it, preventing tests from covering server-impossible branches. Also serves as a barrel re-export point so spec files import error-code and problem-envelope helpers from a single location.

## Key elements

- **`expectDeclaredStatus(method, pathTemplate, status)`** — Cypress chainable that calls the `declaredStatuses` task (passing method + path template) and asserts the requested status is in the declared set. On failure, the assertion message names the verb, path, and expected status. Returns the full declared-status array for further use.
- **Re-exports from `contracts/rest/error-codes.ts`** — `ERROR_CODES` (constant map) and `ErrorCode` (type), so specs don't need the relative path.
- **Re-exports from `tests/support/problem-stub.ts`** — `PROBLEM_MEDIA_TYPE`, `rejectEnvelope`, and `RejectResponse`, the helpers for building RFC 7807 problem-detail responses.

## Relationships

- **`contracts/rest/error-codes.ts`** — sole source of the `ERROR_CODES` / `ErrorCode` re-exports.
- **`tests/support/problem-stub.ts`** — sole source of the `PROBLEM_MEDIA_TYPE` / `rejectEnvelope` / `RejectResponse` re-exports.
- **`src/modules/account/tests/e2e/auth.cy.ts`, `tests/e2e/specs/journeys/fr6-too-many-attempts.cy.ts`, `tests/e2e/specs/journeys/vi3-a-guest-writes-to-the-shop.cy.ts`** — spec files that consume this module (importing `expectDeclaredStatus`, error codes, and/or reject-envelope helpers).
- **`tests/support/e2e/action-table.ts`** — sibling support module in the same directory; specs that use both import them side-by-side.

## Notes

- `expectDeclaredStatus` is a *guard*, not a stub: it asserts the contract before the test proceeds. The actual stubbing (e.g. `rejectEnvelope`) happens in the consuming spec.
- The `declaredStatuses` Cypress task must be registered in `cypress.config` (or a support file); this file only calls it.
- Path templates must match `openapi.yaml` spelling exactly (e.g. `/orders/{id}/cancel`), since the task performs a lookup by that literal key.
- `cy.wrap(declared, { log: false })` is returned so the chainable can be `.then`-ed for the status list without an extra command in the log.
