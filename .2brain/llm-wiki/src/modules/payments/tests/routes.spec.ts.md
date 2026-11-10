---
source: src/modules/payments/tests/routes.spec.ts
sha256: 0dedf1e4809923566680e37350e5c542dcba6e540f69ec08f5355eb386282138
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T05:16:44.201553+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/routes.spec.ts

## Purpose

Vitest spec that pins the access-control metadata declared on every payments route, preventing accidental permission broadening. It also asserts the exhaustive set of route names so that a newly added route cannot slip in without a corresponding assertion.

## Key elements

- **`byName(name: string)`** — module-level helper that searches the imported `routes` array for a record whose `name` matches the argument; returns the record or `undefined`.
- **`describe('payments route access')`** — top-level suite containing two tests:
  - *Staff-page access test* — asserts `PaymentsList` carries `access: 'auth'` and `can: ['display', 'Payment']`.
  - *Exhaustiveness test* — asserts the full list of route names equals `['PaymentsList']`, so any new route must be accounted for here.

## Relationships

- **`src/modules/payments/routes.ts`** — imported as the default export `routes` (typed `RouteRecordRaw[]`). The spec reads each record's `name` and `meta` fields to verify access declarations; no mutation occurs. This is the sole production dependency of the file.

## Notes

- The header comment explains a deliberate choice: the `can` action is `'display'`, not `'read:Payment'`. `read:Payment` is the capability that answers `can` for a *customer*, which would incorrectly admit one to the staff page. `display` is the staff-scoped action that the spec locks in. If the routes file is refactored to a different verb, update the expectation here.
- The exhaustiveness test means adding a new route to `routes.ts` will fail this spec until a corresponding assertion is added — treat that failure as a prompt, not a breakage.
