---
source: scripts/e2e/reset-command.ts
sha256: be308649ba5d802ba2f373129de8b4f85ee6356b75683d2ad9ecdd5056dea6c7
generated_at: 2026-10-02T11:36:02.092935+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/reset-command.ts

## Purpose

Resolves the `{scenario}` placeholder in a `LIVE_RESET_COMMAND` into a concrete shell command string. It exists because the scenario name is a per-call value (chosen at `cy.restore(scenario)` time) while the rest of the command (`{backend}`, `{describeTo}`) is already substituted upstream by `scripts/pairing/paired-backend-path.ts`.

## Key elements

- **`SCENARIO_PLACEHOLDER`** (exported const) — the literal string `'{scenario}'` used both for substitution and for detecting its presence in a command.
- **`SCENARIO_NAME`** (module-private regex `/^[\w-]+$/`) — whitelist of characters allowed in a scenario name before it is spliced into a shell command.
- **`withScenario(command, scenario?)`** (exported function) — returns the final command string:
  - No scenario provided → placeholder replaced with empty string, result trimmed.
  - Scenario provided but fails `SCENARIO_NAME` → throws.
  - Scenario provided but command lacks the placeholder → throws (prevents silently reseeding the wrong scenario).
  - Otherwise → all occurrences of the placeholder replaced with the scenario name.

## Relationships

- **`tests/support/e2e/commands.ts`** — Defines the `cy.restore(scenario)` Cypress command, which is the primary caller of `withScenario`. The resolved string is then passed to `cy.exec`.
- **`tests/unit/scripts/e2e/reset-command.spec.ts`** — Unit tests exercising the three branches of `withScenario` (no scenario, missing placeholder, valid substitution) and the name-validation guard.

## Notes

- The function does a `replaceAll`, so if a command somehow contains multiple `{scenario}` tokens they are all filled identically — this is intentional for idempotent commands but worth knowing.
- The `trim()` on the no-scenario path exists because replacing `{scenario}` with `''` can leave a dangling space in the shell command; don't remove it.
- The validation regex is deliberately restrictive (`\w` and `-`) because the result is interpolated into a shell string via `cy.exec`; this is the only sanitization layer.
