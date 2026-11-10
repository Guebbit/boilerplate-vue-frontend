---
source: tests/support/e2e/role-sweep.ts
sha256: 19b98fa33bfdeb4a038286b1783bfb15ea332b02c176e52cabfce89772083335
signature: 365e7361dcff8e06be47807a005d491636a54d6c17b1a7c663d85c2ed23629fd
generated_at: 2026-11-10T07:34:18.890370+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/role-sweep.ts

## Purpose

Provides `sweepRoles`, a reusable test harness that walks a module's pages once per staff persona and asserts each persona gets exactly the pages, menu links, and buttons its CASL permissions allow. Expected access is derived at runtime from `GET /account` (the same endpoint `session.can` reads), so no hand-typed permission matrix can go stale.

## Key elements

- **`RoleSweepCase`** (interface) — one page under test: `route` (string or async fn), optional `can` permission, optional `menuHref`, `pageRoot` selector, optional `buttons`.
- **`RoleSweepButton`** (interface) — a control whose presence is gated on a single `[action, subject]` permission.
- **`SWEEP_PERSONAS`** — default persona list: `user`, `editor`, `moderator`, `manager`, `warehouse`, `support`, `operator`, `admin`.
- **`sweepRoles(label, cases, personas?)`** (export) — declares a `describe` with one `it` per persona; signs in, sets up a pass-through 401/403 intercept, fetches the persona's abilities, and walks all cases.
- **`evaluatorOf(persona)`** — calls `GET /account` as the persona, unpacks CASL rules into a combined `can()` evaluator (tenant OR platform scope).
- **`expectAllowed` / `expectRefused`** — assert the page either renders cleanly (no 401/403, correct menu link, correct buttons) or is bounced by the router.
- **`menuHas(href)`** — checks whether the admin menu contains a given link.
- **`expectButtons(buttons, evaluator)`** — asserts each button's DOM presence matches its permission.

## Relationships

- **`src/modules/api-keys/tests/e2e/roles.cy.ts`**, **`src/modules/cart/tests/e2e/roles.cy.ts`**, **`src/modules/example/tests/e2e/roles.cy.ts`**, **`src/modules/inventory/tests/e2e/roles.cy.ts`**, **`src/modules/locales/tests/e2e/roles.cy.ts`**, **`src/modules/observability/tests/e2e/roles.cy.ts`**, **`src/modules/orders/tests/e2e/roles.cy.ts`**, **`src/modules/payments/tests/e2e/roles.cy.ts`**, **`src/modules/products/tests/e2e/roles.cy.ts`**, **`src/modules/stats/tests/e2e/roles.cy.ts`**, **`src/modules/tasks/tests/e2e/roles.cy.ts`**, **`src/modules/users/tests/e2e/roles.cy.ts`**, **`src/modules/webhooks/tests/e2e/roles.cy.ts`** — each imports `sweepRoles` and `RoleSweepCase` to declare its module's pages.
- **`tests/support/e2e/harness.ts`** — provides `skipUnlessSessionMode`, used to run only in `jwt` mode.
- **`tests/support/e2e/steps.ts`** — provides `adminMenuLinks` and `isTurnedBack`, used by `menuHas` and `expectRefused`.

## Notes

- Runs **jwt session mode only**; the cookie leg is skipped because page access and API doors are session-mode-agnostic.
- The API intercept is **pass-through** (listens only); it collects 401/403 statuses without altering requests.
- `refusals` array is **reset per page visit**, not per `it`, so a 403 on one page doesn't leak into the next.
- Only `session.can`-gated buttons are checked; `actions.*`-gated controls are left to journey tests.
- A case with **no `can`** means the page requires no rule — every persona (including shopper) must load it without 401/403.
- The per-module `describe` pattern (vs. a central matrix) is intentional: deleting a module removes its `roles.cy.ts` without orphaning a central spec.
