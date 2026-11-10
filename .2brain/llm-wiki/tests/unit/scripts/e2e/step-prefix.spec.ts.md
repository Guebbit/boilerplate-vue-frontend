---
source: tests/unit/scripts/e2e/step-prefix.spec.ts
sha256: ad66ad36bf489446393347e42f5fdca0d780636eebe0d27c409edae0a38dd6b4
signature: ad66ad36bf489446393347e42f5fdca0d780636eebe0d27c409edae0a38dd6b4
generated_at: 2026-11-10T08:18:29.257620+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/step-prefix.spec.ts

## Purpose

Unit test for the `prefixWithStep` helper, verifying that e2e failure messages are annotated with the step they occurred in—without double-annotating—so that a journey's error output tells you *where* it broke.

## Key elements

- **`describe('prefixWithStep', …)`** — single block containing three cases:
  - *Prefixes with step name*: asserts `prefixWithStep(msg, step)` returns `[step: <step>]\n<msg>`.
  - *No-op for undefined step*: asserts the original message is returned unchanged when no step has started yet.
  - *Idempotency*: asserts that running `prefixWithStep` a second time on an already-prefixed string returns the same string (no double `[step: …]` header).

## Relationships

- **`scripts/e2e/step-prefix.ts`** — the sole module under test. This spec imports `prefixWithStep` directly and asserts on its return value; no other dependencies or fixtures are used.

## Notes

- The idempotency test implies `prefixWithStep` must internally detect an existing `[step: …]` prefix before appending. Any change to the prefix format (e.g., different bracket syntax) will break both the first and third tests.
- The step label is placed *above* the original message, separated by a single `\n`—not appended after it.
