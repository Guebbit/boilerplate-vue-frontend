---
source: tests/e2e/specs/journeys/double-press.cy.ts
sha256: f99e1f41977da5ddecd9bdfe04eb5419b49f33570e589d286f8c80be8c919aae
signature: a5e7b587c7837cd3378643e01d74431970025e559614a463adb5e0d153c61a61
generated_at: 2026-11-10T07:03:10.124216+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/double-press.cy.ts

## Purpose

E2E test for FR19: verifies that a fast double-press (`dblclick`) on any money-moving control (cancel, refund, ship, record-payment, withdraw) produces at most one server-side effect, at most one confirmation dialog, no error alert, and—if two requests escape—both carry the same `Idempotency-Key`. Six rows cover the full set of personas and controls that move money or stock.

## Key elements

- **`PressRow` (interface)** — shape of one test row: persona, page, trigger selector, operation intercept pattern, whether a confirm dialog appears, and a callable `effect` that reads the server state after the press.
- **`statusOf(persona, orderId)`** — helper that GETs `/orders/:id` as a given persona and returns the `status` string as a Cypress chain.
- **`refundState(orderId)`** — helper that GETs `/orders/:id/payments` as admin and returns `'refunded'` or `'open'` by comparing `amountRefunded` to `amount`.
- **`ROWS` (readonly array, 6 entries)** — the concrete scenarios: user cancel (confirm), admin cancel-and-refund, admin refund-only, warehouse ship, admin record-offline-transfer, user withdraw (confirm).
- **`Seen` (interface)** — accumulator for `Idempotency-Key` header values observed by the intercept.
- **`describe('FR19 …')` / `for (const row of ROWS)`** — single test loop; each row logs in, visits the page, optionally calls `prepare()`, intercepts the POST, fires `dblclick()` on the trigger, optionally double-clicks the confirm button, then asserts: no error element, `effect` equals `done`, 1–2 requests, and shared idempotency key if 2.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `dblclick()` in Cypress dispatches two synchronous `click` events with no gap—the strictest double-press; no timing manipulation is needed.
- The single `cy.wait(1000)` after answering a confirm dialog is intentional: it is a bounded window to prove *absence* of a second dialog (nothing signals "no more dialogs are coming"), and the ESLint disable is scoped to that one line.
- The intercept only captures the header and calls `request.continue()`—it does not stub the response, so the real server executes the operation.
- `prepare` is optional; rows that need pre-state (warehouse ship, offline transfer) set it, while cancel/refund/withdraw rows do not.
- The idempotency assertion tolerates two requests (the browser may fire both before the first lands) but requires they share one key, distinguishing "safe retry" from "duplicate operation."
- The file declares a runtime dependency on the `orders`, `payments`, and `returns` modules via the `requires-module` comment, and relies on custom Cypress commands (`cy.apiAs`, `cy.subjectId`, `cy.loginAs`, `cy.restore`) provided by the shared test-support layer.
