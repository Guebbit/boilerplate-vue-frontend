---
source: tests/e2e/specs/journeys/at9-the-platform-operator-is-not-the-shop.cy.ts
sha256: 6c237f6b085bdbf216fd4007364d0105d4a03892aa18272f1df0611a69a6e26e
signature: e428558312cb0a007acb9e97ff792c4f84c24db2b7119fd336a1ce27e7456a01
generated_at: 2026-11-10T06:52:57.273562+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at9-the-platform-operator-is-not-the-shop.cy.ts

## Purpose

E2E test for story AT9: verifies that the platform operator role is strictly separated from shop roles. The operator sees only platform pages (admin, realtime) and is turned back from shop pages (users, audit, inventory, etc.). Its audit trail hides IP addresses (shown as a digest) and omits protected-role (`role_protected`) refusal rows. The seeded `root`/`admin` account, which holds both roles, can see everything.

## Key elements

- **`AuditRowLike`** — local interface describing the subset of an audit row the test reads (`action`, `actorRole`, `metadata?.reason`).
- **`IPV4`** — regex used to assert that no raw dotted-quad address appears in the operator's audit rows.
- **`describe('AT9 · …')`** — the test suite; `beforeEach` resets state via `cy.visit → cy.restore → cy.visit`.
- **Test 1 — menu & page separation** — signs in as `operator`, asserts the admin menu contains only platform links and excludes shop links; visits `/en/admin` (success) and typed shop URLs (turned back); then switches to `admin` and asserts both halves are visible.
- **Test 2 — audit trail, realtime, customer view** — creates two incidents (a refused login, a support-role PATCH rejected with `ROLE_MANAGEMENT_REQUIRED`); asserts the operator's audit tab shows the login refusal with no raw IP, shows no `security.forbidden` / `role_protected` rows; connects the realtime playground stream; verifies the operator sees a customer basket and empty orders list but is turned back from `/en/sales/orders`; finally confirms the admin *does* see the protected-role refusal via the audit API.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the shared step helpers `adminMenuLinks`, `eventually`, `isTurnedBack`, `refuseALogin`, and `refusedWith` used throughout the spec.
- **`tests/support/e2e/harness.ts`** — provides `loginDevice`, used to obtain a support-role device token so the test can trigger the `403 ROLE_MANAGEMENT_REQUIRED` refusal.

## Notes

- `beforeEach` calls `cy.restore()` (a custom command) to roll back the database between the two tests.
- The operator is explicitly *not* blocked from the shop as a customer: it can open `/en/orders` and see an empty list, but `/en/sales/orders` (staff-facing) turns it back.
- The admin-side assertion uses the `eventually` polling helper against `GET /audit?target=…` rather than the UI, because the operator's UI filter would hide that row.
- `cy.loginAs('operator')` and `cy.switchUser('admin')` are custom commands (not visible in this file) that manage session switching.
