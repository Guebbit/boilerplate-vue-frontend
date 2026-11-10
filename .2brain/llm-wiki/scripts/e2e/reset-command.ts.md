---
source: scripts/e2e/reset-command.ts
sha256: be308649ba5d802ba2f373129de8b4f85ee6356b75683d2ad9ecdd5056dea6c7
signature: f4448fd2da6d4a0a8b44bc0dee48a7329a25938e7f52e46db228ce501b68d6c0
generated_at: 2026-11-10T02:35:20.229381+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/reset-command.ts

## Purpose

Resolves the `{scenario}` placeholder in a `LIVE_RESET_COMMAND` string at restore time, producing the concrete shell command that will be passed to `cy.exec`. It exists because the backend receives the scenario name as a positional argument, and that value is only known per-call—not when the command template is defined.

## Key elements

- **`SCENARIO_PLACEHOLDER`** (exported const) — the literal `'{scenario}'` token expected inside the resolved `LIVE_RESET_COMMAND`.
- **`withScenario(command, scenario?)`** (exported function) — returns the executable command string:
  - `scenario` is `undefined` → replaces every placeholder with empty string (backend falls back to its default).
  - `scenario` is provided but the command has no placeholder → throws, because running the reset would silently reseed the default and break assertions.
  - `scenario` is provided and placeholder is present → replaces every placeholder with the scenario name.
- **`SCENARIO_NAME`** (internal regex) — `/^[\w-]+$/`; guards against shell injection since the value is spliced into a `cy.exec` command.

## Relationships

- **`tests/support/e2e/commands.ts`** — consumer of this module; imports `withScenario` to resolve the scenario placeholder into the reset command before execution.
- **`tests/unit/scripts/e2e/reset-command.spec.ts`** — unit-test suite covering the three `withScenario` branches (no scenario, missing placeholder, valid substitution) and the name-validation rejection.

## Notes

- The placeholder is a *global* replacement (`replaceAll`), so a command template can contain multiple `{scenario}` tokens; all are filled identically.
- An un-named restore does **not** throw—it produces a command with the placeholder stripped, relying on the backend's own default. The error path only fires when a scenario *is* named but the template cannot accept it.
- Scenario names are restricted to `\w` and `-`. If the registry key space ever widens, `SCENARIO_NAME` must be updated in lockstep to avoid silently accepting or rejecting valid keys.
