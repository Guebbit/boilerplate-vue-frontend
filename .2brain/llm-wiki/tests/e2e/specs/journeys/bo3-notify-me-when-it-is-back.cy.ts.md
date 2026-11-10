---
source: tests/e2e/specs/journeys/bo3-notify-me-when-it-is-back.cy.ts
sha256: 01d0a41b4cd18cb6a9b44074a0aa75544c14ef9786804acfffbb211bc994acc5
signature: ee93c4d462e6ae9845c81734b11762bc6148bfc4aac1a649fbcaab40ac0ae088
generated_at: 2026-11-10T06:53:32.023429+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/bo3-notify-me-when-it-is-back.cy.ts

## Purpose

E2E journey test for the **BO3 · Notify me when it is back** feature. It verifies the full stock-alert lifecycle from a signed-in shopper's perspective: request notification on a sold-out product, confirm the button state changes to "You'll be told", restock the item as admin, then assert exactly one email (linking to the product) and one inbox row arrive, and that the request is subsequently cleared.

## Key elements

- **`unique()`** – returns a timestamp+random string so product titles (and thus API records) stay unique across parallel runs on a shared backend.
- **`InboxLike`** – minimal structural interface (`{ items: { code: string }[] }`) for the `/notifications` response slice the test asserts against.
- **`beforeEach`** – visits `/en`, calls `cy.restore()` (fixture reset), visits `/en` again to get a clean session.
- **Single `it` block** – drives the whole story in one test:
  1. Creates a sold-out product as `editor` via `cy.apiAs`.
  2. Logs in as `user`, clicks the `[data-test=notify-me]` button, asserts text changes to *"You'll be told"*.
  3. Restocks via `cy.apiAs('admin', …)` on the inventory receive endpoint.
  4. Asserts one email with subject containing "is back" and body containing the product URL.
  5. Polls `/notifications` with `eventually` until a `shop-tasks.stock-alert` row appears.
  6. Visits `/en/stock-alerts` and asserts `[data-test=stock-alert-row]` no longer exists.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the `eventually` helper, which wraps a Cypress command + predicate into a retry loop. The test uses it to poll the notifications endpoint asynchronously (the inbox row is written server-side after restock and may not be immediately visible).
- The `requires-module` header comment declares dependencies on the **account**, **inventory**, **products**, and **stock-alerts** modules—these are the backend services the test's API calls hit.

## Notes

- The file's own doc comment warns it was *written against the live pages and not yet run in a browser*; first execution may require selector adjustments.
- Three distinct API roles are used in one test: `editor` (create product), `user` (shopper actions), `admin` (restock). Ensure all three roles exist in the fixture/seed before running.
- `eventually` is the only import from `steps.ts`; all other `cy.*` commands (`step`, `apiAs`, `loginAs`, `emailTo`, `accountOf`, `restore`) are presumably registered as custom commands elsewhere in the support layer.
