---
source: tests/support/e2e/scenario.ts
sha256: 9e4ce0c993575c03d669055f1959ef654670007686eceef67bc522208f537906
signature: ea566147c849f328cfe69c1534f66f909872a90cec5756d4ed7ec6fae483586c
generated_at: 2026-11-10T07:34:46.877745+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/scenario.ts

## Purpose

Support file that loads the running backend's scenario description (seeded account credentials and subject row ids) and exposes them to spec files. It exists because specs must reference backend-generated ids and per-deployment-overridable passwords without hardcoding them, and Cypress has no synchronous fetch—so the description is loaded once per spec file and read synchronously thereafter.

## Key elements

- **`NOTHING_DESCRIBED`** — Constant `ScenarioDescription` with null scenario and empty maps; the sentinel for a backend that has not described itself.
- **`current`** (module-level `let`) — The loaded `ScenarioDescription` for the currently-running spec file. Set by `loadScenario`; read by `seedAccount` and the `subjectId` command.
- **`fetchScenario`** (internal) — Branches on `cy.env('liveProfile')`: live profile calls `cy.task('readScenarioFile')`, demo profile calls `GET /__test/scenario`.
- **`loadScenario`** (exported) — Calls `fetchScenario`, stores the result in `current`. Invoked by `cy.restore()` and the `before` hook.
- **`seedAccount(role)`** (exported, synchronous) — Returns the `ScenarioAccount` for the given `E2ERole` from `current.accounts`. Throws with a descriptive message if the role is absent.
- **`cy.subjectId(name)`** (Cypress command) — Returns the row id the backend published under a guarantee name (e.g. `order.paid`). Throws listing available names when the key is missing.
- **`cy.accountOf(role)`** (Cypress command) — Command-form of `seedAccount`; reads credentials when the command executes (after any mid-spec `cy.restore()`).
- **`before` hook** — Calls `loadScenario()` once per spec file so `current` is populated before any synchronous read.
- **Global `Chainable` augmentation** — Declares `subjectId` and `accountOf` on `Cypress.Chainable` for type safety.

## Relationships

- **`tests/support/scenario-description.ts`** — Source of the `E2ERole`, `ScenarioAccount`, and `ScenarioDescription` types imported here.
- **`tests/support/e2e/e2e.ts`** — Primary support entry; loads this module so the `before` hook and command registrations are active for all specs.
- **`tests/support/e2e/commands.ts`** — Uses the same "load-once, read-synchronously" pattern for `__APP_CONFIG`; this file follows that convention.
- **`tests/support/e2e/fixtures.ts`** — Sibling support file in the same directory; specs consume its fixtures alongside scenario data.
- **`src/modules/account/tests/e2e/a11y.cy.ts`**, **`account.visual.cy.ts`**, **`keyboard.cy.ts`**, **`password-reset.cy.ts`**, **`profile.cy.ts`**, **`two-factor.cy.ts`** — Account-module spec files that call `seedAccount` and/or `cy.subjectId` at runtime (loaded via the support-file copy of `current`, not a direct import).
- **`src/modules/payments/tests/e2e/order-reference-search.cy.ts`** — Payments spec that calls `cy.subjectId` to resolve order row ids.
- **`tests/e2e/specs/commerce.cy.ts`**, **`journey.cy.ts`**, **`locale.cy.ts`** — Top-level spec files that depend on `seedAccount` / `cy.subjectId` / `cy.accountOf` registered by this module.

## Notes

- **Synchronous vs. command split is intentional.** `seedAccount` is a plain function (synchronous read of `current`) because spec lines need it mid-chain without a `cy.then`. `subjectId` is a command because subject ids change after every `cy.restore()`. `accountOf` exists as a command for specs that import this module and would otherwise hold a stale copy of `current`.
- **Importing this file from a spec creates a second `current`.** The support file's `before` hook refreshes the support copy on `cy.restore()`, but a spec's own module instance will not. That is harmless for accounts (logins never change) but wrong for `order.*` ids. The convention: specs use `cy.accountOf` / `cy.subjectId` and import nothing from this file.
- **Live profile has no `/__test/*` surface.** The description arrives as a JSON file written by `LIVE_RESET_COMMAND --describe-to`; until a reset runs, `readScenarioFile` returns `null` and the spec sees `NOTHING_DESCRIBED`, causing `seedAccount` to throw with a hint to set `LIVE_RESET_COMMAND`.
- **`Id` is deliberately format-free** in the shared contract; a spec referencing a specific id has adopted a backend-specific constraint. The name-based lookup (`subjectId`) is the intended indirection.
