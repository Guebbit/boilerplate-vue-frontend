---
source: src/modules/tasks/tests/routes.spec.ts
sha256: ac02190536f3249b4151be24e2a2ca5035d72af6c73af893fc4f2d33db0fe589
signature: ac02190536f3249b4151be24e2a2ca5035d72af6c73af893fc4f2d33db0fe589
generated_at: 2026-11-10T05:59:56.267914+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/routes.spec.ts

## Purpose

Pin-tests the `meta.access` and `meta.can` values declared on every task route. Without this file, a route that loses its access metadata would silently fall through to "public" with no test failing. It also asserts the route inventory is exactly the set of names listed here, catching unregistered additions.

## Key elements

- **`describe('tasks route access')`** — top-level suite containing all assertions.
- **`it.each([...])`** — table-driven test over the three routes (`Contact`, `TaskInbox`, `TaskDetail`). For each, it verifies:
  - The route exists by name in the imported `routes` array.
  - `route.meta.access` equals the expected access level (`undefined` for Contact, `'auth'` for the other two).
  - `route.meta.can` equals the expected `[action, subject]` tuple (`undefined` for Contact, `['read', 'Task']` for the inbox/detail routes).
- **`it('declares no route this file does not know about')`** — sorted-inventory guard: the set of route names in the imported array must be exactly `{ Contact, TaskInbox, TaskDetail }`. Adding a new route without updating this file fails CI.

## Relationships

- **`src/modules/tasks/routes.ts`** — the sole import. This test reads the default-exported route array and asserts on each entry's `name`, `meta.access`, and `meta.can` fields. No other files are touched.

## Notes

- The test is intentionally a *hard-coded* table rather than a dynamic check, so the "correct" access matrix lives here and in the source route file simultaneously — changing one without the other is a deliberate, visible break.
- `Contact` is expected to have **no** `access` and **no** `can`; this is a documented product decision (public contact form), not a missing-value bug.
- The inventory test uses `.toSorted()` on both sides, so route order in the source array is irrelevant to this assertion.
