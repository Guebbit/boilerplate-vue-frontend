---
source: scripts/e2e/step-prefix.ts
sha256: 28e4e88be1474a43b0bd9ac8ed85087f1ea4d777ad41dd4ecdc9132ad8a72a82
generated_at: 2026-10-02T11:37:32.749965+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/step-prefix.ts

## Purpose

Pure helper that formats a Cypress failure message by prepending the current step name (`[step: <name>]`) so that error output identifies which step a failure occurred in. Extracted as a standalone module so it can be unit-tested without a live Cypress browser session.

## Key elements

- **`STEP_MARKER`** (`const`) — the literal `'[step: '` string; used both to build the prefix and as an idempotency guard so a second pass doesn't double-prefix.
- **`prefixWithStep(message, step)`** (`export const`) — returns the message unchanged when `step` is `undefined` or the message already starts with `STEP_MARKER`; otherwise returns `"[step: <step>]\n" + message`.

## Relationships

- **tests/support/e2e/journey.ts** — the `fail` event handler in the E2E journey setup calls `prefixWithStep` to annotate every captured failure before rethrowing. This is the sole runtime consumer.
- **tests/unit/scripts/e2e/step-prefix.spec.ts** — unit-tests `prefixWithStep` directly (prefixing, no-step, already-prefixed, and edge cases) without launching Cypress.

## Notes

- The function is deliberately idempotent: calling it twice on the same message is a no-op on the second call. Any code that wraps or forwards failure messages should rely on this rather than tracking whether a prefix was already applied.
- The newline (`\n`) after the closing bracket separates the step tag from the original message, keeping the original text on its own line for readability in terminal/HTML output.
