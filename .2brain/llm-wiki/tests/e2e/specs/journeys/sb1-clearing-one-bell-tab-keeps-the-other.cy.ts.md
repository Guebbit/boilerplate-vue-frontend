---
source: tests/e2e/specs/journeys/sb1-clearing-one-bell-tab-keeps-the-other.cy.ts
sha256: c12728dde8ca3acdcd81abbcffca91ca89ee05ad0f9db03a79b11b5747d4db1a
signature: 26854a56b796d1bb04c03f82875ae288b6339f65f7e98ceee6131319a29698e7
generated_at: 2026-11-10T07:21:39.384876+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/sb1-clearing-one-bell-tab-keeps-the-other.cy.ts

## Purpose

End-to-end test (Cypress) verifying that the notification bell's "Clear all" action is scoped to a single tab: clearing the "Mine" tab does not erase "Work" notices, and vice-versa. Reloads are used after each clear to confirm the server—not just the client—respects the per-tab scope.

## Key elements

- **`BELL` / `PANEL` / `CART_MESSAGE`** — CSS selectors and the fixed cart-notification text used to locate UI elements.
- **`WORK_ROW(taskId)`** — Builds a selector for the specific Work-tab row whose "Open it" link targets the given task id, distinguishing it from other notifications that share the same kind text.
- **`TAB(name)`** — Returns the selector for a tab button (`mine` or `work`).
- **`SUBJECT`** — Unique task-subject string (`"SB1 a question about the cats"`) used so this spec's task is identifiable among all tasks.
- **`openedTaskId()`** — Queries the admin task list by `SUBJECT`, asserts exactly one match, and returns the task id.
- **`holdOneOnEachTab()`** — Setup helper: adds a product to the admin cart via API, deletes it as the editor (triggering a "Mine" bell message), then opens a task as a customer (triggering a "Work" bell message). Returns `{ productId, taskId }` for assertions and cleanup.
- **`describe` / `it` blocks** — Two cases: (1) clear Mine → reload → Work row still present; (2) clear Work → reload → cart message still present and Work tab removed.

## Relationships

- **`src/modules/cart/tests/guest-cart.property.spec.ts`** — Both files exercise the **cart module** (declared in the `requires-module` comment). This e2e test posts to `/cart/items` and depends on the cart module's "product removed from cart" notification path; the property spec validates cart invariants at the unit/property level. No direct import exists between the two files; the shared dependency is the cart module's behavior.

## Notes

- The editor (not the admin) performs the product delete, because the admin *is* the staff member receiving the bell notification; an actor never hears their own act.
- The admin's cart is filled via API rather than the storefront UI—staff see a product table, not storefront cards—so the cart screen is out of scope for this spec.
- Cleanup restores the product via `POST /products/:id/restore` inside each test body (not `afterEach`), keeping the restore co-located with the assertion that depends on it.
- `WORK_ROW` disambiguates by the **link href**, not by notification text, because the task-kind text is shared with other contact messages.
