---
source: scripts/e2e/report-flaky.ts
sha256: 902ba6f191cc494fb32c917f60ccf837e119a9e500c07599f9f8c2904254f602
signature: 902ba6f191cc494fb32c917f60ccf837e119a9e500c07599f9f8c2904254f602
generated_at: 2026-11-10T02:34:59.517283+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/report-flaky.ts

## Purpose

Thin entry-point script that prints the flaky-test report (tests that passed only after a retry) for a single Cypress run that did **not** go through `run-shards.ts` (e.g. the live profile). A CI step invokes it unconditionally after Cypress and treats the output as a warning only.

## Key elements

- **Top-level call `printFlakyReport()`** — the entire body of the script; delegates all logic to `./flaky-report`.
- **Shebang `#!/usr/bin/env tsx`** — indicates the file is meant to be executed directly as a TypeScript script.

No named exports, classes, or additional functions are defined here.

## Relationships

- **`scripts/e2e/flaky-report.ts`** — sole dependency. Imports `printFlakyReport` from that module and calls it immediately. All report-formatting and data-reading logic lives in that neighbor.

## Notes

- Always exits 0: the script never sets a non-zero exit code, so a flaky-test finding is a warning, not a failure.
- Intended for the *non-sharded* path only. Sharded runs are expected to surface flaky results through `run-shards.ts` instead.
- Because it is a one-liner wrapper, any behavior changes should be made in `flaky-report.ts`, not here.
