---
source: src/modules/payments/tests/routes.spec.ts
sha256: 0dedf1e4809923566680e37350e5c542dcba6e540f69ec08f5355eb386282138
generated_at: 2026-10-17T01:25:47.111443+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/routes.spec.ts

## Purpose

Test suite that pins the access-control metadata declared on every payments route. It exists to prevent a silent permission regression where a route's `can` check could be satisfied by a less-privileged action (e.g. `read:Payment` instead of `display`) and to catch any route added to the module without a corresponding entry in this spec.

## Key elements

- **`byName(name)`** — Internal helper that returns the first `RouteRecordRaw` in the imported routes array whose `name` matches, or `undefined`.
- **`it('opens the staff page only on the staff action on payments')`** — Asserts that the `PaymentsList` route carries `meta.access: 'auth'` and `meta.can: ['display', 'Payment']`.
- **`it('declares no route this file does not know about')`** — Completeness guard: asserts the full list of route names is exactly `['PaymentsList']`, so any newly added route fails the test until it is explicitly accounted for here.

## Relationships

- **`src/modules/payments/routes.ts`** — The file under test. This spec imports its default export (`routes`, an array of `RouteRecordRaw`) and asserts on the `name` and `meta` fields of each entry.

## Notes

- The module docblock highlights the *reason* the `display` check matters: a bare `read:Payment` action would also satisfy a customer's `can` query, so the spec deliberately pins the stricter action to lock it in.
- The completeness test (second `it`) means any new route added to `routes.ts` will break this spec until the expected-name list is updated. Treat the test as a registry of known routes.
