---
source: src/modules/observability/tests/e2e/roles.cy.ts
sha256: d8aba8fe22b9083f9bae61e219025e47f5628e89cda543e0de708251a3e30bd6
signature: d8aba8fe22b9083f9bae61e219025e47f5628e89cda543e0de708251a3e30bd6
generated_at: 2026-11-10T04:55:06.059403+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/e2e/roles.cy.ts

## Purpose

End-to-end role-sweep case list for the observability module. It declares which personas must be able to reach each platform page (administration, realtime playground, audit trail) and which permissions they need, then hands that list to a shared helper that drives the browser and asserts the UI matches the persona's rules. The file is deliberately co-located with the module so that deleting observability also deletes its sweep.

## Key elements

- **`sweepRoles`** (imported from `tests/support/e2e/role-sweep.ts`) — the single function called with the module name `'observability'` and an array of role-case objects. All navigation, login-as-persona, and permission-assertion logic lives in the helper.
- **Case array** — three entries, each specifying:
  - `name` — persona label (`administration`, `realtime`, `audit trail`)
  - `route` — the URL the browser navigates to
  - `can` — the permission pair the persona is expected to hold (e.g. `['read', 'ObservabilitySnapshot']` or `['read', 'AuditLog']`)
  - `menuHref` — the in-app menu link to verify is present/clickable
  - `pageRoot` — a DOM selector (`#admin-page`, `#realtime-playground-page`, `#audit-log-page`) the helper uses to confirm the correct page rendered

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — sole dependency. This file is purely a declarative data list; it imports `sweepRoles` and calls it once. No other imports or exports exist.

## Notes

- The file is marked `@module` and has **no exports**; it runs for side effects when the Cypress runner loads it. It is safe to delete without breaking any import graph.
- Co-location under `src/modules/observability/tests/e2e/` is intentional (stated in the file's doc comment): the lifecycle of the test is tied to the module's lifecycle.
- Only the `read` permission is asserted per case; write/modify permissions are not exercised here.
