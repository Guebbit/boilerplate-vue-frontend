---
source: tests/support/e2e/scenario.ts
sha256: 9256793d1f607b13d11a302c853c204283fbefdc344bb7e1f4b88623c2c39fbe
generated_at: 2026-10-17T02:26:38.959599+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/scenario.ts

## Purpose

Defines the typed contract for the scenario a running backend seeds, and exposes Cypress commands to retrieve seeded account credentials and row IDs by name. It exists so spec files never hard-code passwords or IDs that are backend-specific and overridable per deployment; instead they ask the backend (or its description file) by guarantee name.

## Key elements

- **`ScenarioDescription`** — interface describing the full answer: `scenario` (string | null), `accounts` (role → credentials), `subjects` (guarantee name → row id).
- **`ScenarioAccount`** — credentials for one seeded login (`email`, `password`, optional `backupCodes`).
- **`E2ERole`** — union type of all 13 seeded role names (admin, user, editor, moderator, personas, staff).
- **`loadScenario()`** — fetches the description (API for demo, file task for live) and stores it in the module-level `current`. Returns the description as a `Chainable`.
- **`seedAccount(role)`** — synchronous read of `current.accounts[role]`; throws a descriptive error when the backend described no such account. Used by 20+ spec lines that type into login forms.
- **`cy.subjectId(name)`** — Cypress command returning the row id under a guarantee name; throws naming all available names when absent.
- **`cy.accountOf(role)`** — Cypress command form of `seedAccount` for spec files that prefer the command API.
- **`before(() => loadScenario())`** — module-scope hook that loads the description once per spec file before any test reads it.
- **Global `Cypress.Chainable` augmentation** — adds `subjectId` and `accountOf` to the type system.

## Relationships

- **`tests/support/e2e/commands.ts`** — uses the same "load once, read synchronously" pattern for `__APP_CONFIG`; this file mirrors that arrangement for scenario data.
- **`tests/support/e2e/harness.ts`** — owns `cy.restore()`, which calls back into `loadScenario()` when a spec switches scenarios mid-file.
- **`tests/support/e2e/e2e.ts`** — the support-file entry point that causes this module's `before` hook and command registrations to execute.
- **Spec files** (e.g. `src/modules/account/tests/e2e/*.cy.ts`, `tests/e2e/specs/*.cy.ts`) — consume `seedAccount`, `cy.subjectId`, and `cy.accountOf`; each gets its own copy of the description loaded by its own `before` hook.
- **`tests/support/e2e/fixtures.ts`** — provides the `readScenarioFile` Cypress task used by the live-profile branch of `fetchScenario`.

## Notes

- The module-level `current` variable is intentionally shared mutable state. `seedAccount` reads it synchronously because Cypress has no synchronous fetch; the data is loaded ahead in `before` and refreshed by `cy.restore()`.
- `subjectId` is a command (not a plain function) because subject IDs change after every live reset, whereas account logins do not — the command form guarantees the read happens at execution time against the freshest `current`.
- Under the **live** profile there is no `/__test/*` endpoint; the description comes from a file written by `LIVE_RESET_COMMAND`'s `--describe-to` flag. If no reset has run, the description is `null` and `seedAccount` throws a message naming the missing env var.
- `accountOf` wraps `seedAccount` in a no-op `cy.wrap(null)` solely to give it the command call-stack shape; it still reads the same `current` the spec file loaded in its own `before`, not the support file's copy.
- The `operator` role has **no** shop membership — it holds only the platform-level operator role, which matters for specs that assert role-scoped visibility.
