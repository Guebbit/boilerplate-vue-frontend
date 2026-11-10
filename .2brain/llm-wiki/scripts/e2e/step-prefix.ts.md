---
source: scripts/e2e/step-prefix.ts
sha256: 28e4e88be1474a43b0bd9ac8ed85087f1ea4d777ad41dd4ecdc9132ad8a72a82
signature: 88286edd86b2d67fa368dd8176d6a32946045df68466e8f35871d574d11fd32f
generated_at: 2026-11-10T02:37:02.438855+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/step-prefix.ts

## Purpose

Provides a pure helper that prepends a `[step: <name>]` marker to a Cypress failure message so that stack traces and error output identify which step was active when the test failed. It lives outside the browser runtime so it can be unit-tested without launching Cypress.

## Key elements

- **`STEP_MARKER`** (internal constant) — the literal string `'[step: '` used both to build the prefix and to detect an already-prefixed message.
- **`prefixWithStep(message, step)`** (exported) — Returns `message` unchanged when `step` is `undefined` or the message already begins with `STEP_MARKER`; otherwise returns `"[step: ${step}]\n" + message`.

## Relationships

- **`tests/support/e2e/journey.ts`** — Calls `prefixWithStep` inside the global `fail` event handler it registers, so every uncaught error is tagged with the current step name before Cypress displays it.
- **`tests/unit/scripts/e2e/step-prefix.spec.ts`** — Exercises `prefixWithStep` directly (pure function, no browser needed), covering the no-step, already-prefixed, and normal-prefix paths.

## Notes

- Idempotent by design: the `startsWith(STEP_MARKER)` guard prevents double-prefixing if the handler is ever invoked more than once on the same message.
- The module is intentionally free of Cypress imports; the doc comment notes that the `fail` handler that rethrows cannot itself be asserted on from within a spec, which is the sole reason this logic is split out into a testable unit.
