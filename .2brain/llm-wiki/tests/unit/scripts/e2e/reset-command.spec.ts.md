---
source: tests/unit/scripts/e2e/reset-command.spec.ts
sha256: c0667619cf85f5c398f5532566e5589f0ae3a83ddea376eed6a1427249f08ff9
signature: c0667619cf85f5c398f5532566e5589f0ae3a83ddea376eed6a1427249f08ff9
generated_at: 2026-11-10T08:17:30.553680+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/reset-command.spec.ts

## Purpose

Unit tests for `withScenario`, the helper that substitutes a named scenario into a reset command's `{scenario}` placeholder before `cy.restore(scenario)` runs it. The tests guard against the silent failure mode where a named scenario is passed to a command that cannot accept one, causing the spec to assert against the wrong (default) rows.

## Key elements

- **`COMMAND`** — module-level fixture string containing a `{scenario}` placeholder, used by most test cases.
- **`describe('withScenario', …)`** — five test cases:
  - *placeholder substitution*: asserts the scenario name is spliced into `{scenario}`.
  - *unnamed restore*: asserts the placeholder is removed (leaving a double space) so the backend falls back to its default.
  - *named scenario + no placeholder*: asserts a throw with `/no {scenario} placeholder/`.
  - *unnamed + no placeholder*: asserts the command passes through unchanged.
  - *shell-injection guard*: asserts a name like `shop; rm -rf /` is rejected with `/not a scenario name/`.

## Relationships

- **`scripts/e2e/reset-command.ts`** — provides the `withScenario(command, scenario?)` function under test. This spec is its only dedicated unit-test file.

## Notes

- The "unnamed restore" case expects a **double space** (`--  --describe-to`) in the output, reflecting the placeholder being replaced with an empty string rather than being removed entirely. Tests will break if the implementation trims whitespace differently.
- The file's header comment says `tests/support/e2e/reset-command.ts`, but the actual import resolves to `scripts/e2e/reset-command.ts`. Treat the comment as stale.
- The injection test (`shop; rm -rf /`) is a pure string check inside the library — no shell is ever invoked.
