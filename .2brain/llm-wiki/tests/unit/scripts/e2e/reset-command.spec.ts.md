---
source: tests/unit/scripts/e2e/reset-command.spec.ts
sha256: c0667619cf85f5c398f5532566e5589f0ae3a83ddea376eed6a1427249f08ff9
generated_at: 2026-10-17T02:43:26.885233+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/reset-command.spec.ts

## Purpose

Unit tests for the `withScenario` helper that substitutes a named scenario into a reset-command template before `cy.restore(scenario)` executes it on a live profile. The tests exist to catch the silent failure mode where a mismatch between the provided scenario name and the command's placeholder would reseed the default profile and let a spec assert against the wrong rows.

## Key elements

- **`describe('withScenario')`** — the single test block covering all contract points of `withScenario`.
- **`COMMAND`** (module-level const) — a representative command string containing the literal `{scenario}` placeholder; used by most test cases.
- **Test cases (5):**
  - Replaces `{scenario}` with the supplied name (e.g. `'blank'`).
  - Leaves the placeholder position as a bare gap (double space) when no scenario is passed, so the backend falls back to its default.
  - Throws `/no {scenario} placeholder/` when a name is given but the command lacks the placeholder.
  - Passes a placeholder-less command through unchanged when no name is supplied.
  - Rejects scenario names containing shell metacharacters (`;`, spaces, etc.) with `/not a scenario name/`.

## Relationships

- **`scripts/e2e/reset-command.ts`** — the module under test; this spec imports `withScenario` from it. No other files in the graph are exercised by these tests.

## Notes

- The file's top doc comment references `tests/support/e2e/reset-command.ts`, but the actual import resolves to `scripts/e2e/reset-command.ts` (four levels up). The comment is describing *what the tested helper does at runtime*, not the spec's own location.
- The "no scenario" case intentionally produces a double-space (`--  --describe-to`) rather than stripping the placeholder; downstream tooling is expected to tolerate the empty argument.
- Shell-injection guard (`shop; rm -rf /`) validates that `withScenario` enforces a strict character/shape policy on the scenario name before interpolation.
