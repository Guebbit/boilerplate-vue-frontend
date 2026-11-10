---
source: scripts/fail-script.ts
sha256: 595849b90e2319360fe87522ed5404462230b236655e474cdd7fe75e4c5cde1b
signature: 0ce133414b05e25bbc74c74baae07dc251944ccfa567acdbc56c76809bda6ee9
generated_at: 2026-11-10T02:41:28.256394+00:00
model: ollama:qwen3.8:27b
---

# scripts/fail-script.ts

## Purpose

A minimal, dependency-free exit handler for scripts that do not go through the shared `runScript` wrapper. It logs the rejection and sets a non-zero exit code. It lives in its own file with zero imports so that tooling (e.g. a docs generator) can pull it in without transitively loading the logger, config, or Mongoose the way `run-script.ts` does.

## Key elements

- **`failScript(error: unknown): void`** — Logs `"Script failed."` followed by the error via `console.error`, then sets `process.exitCode = 1`. Intended to be used as `main().catch(failScript)`.

## Relationships

- **`scripts/contracts/generate-shared-rules.ts`** — Consumes `failScript` as the top-level rejection handler for its script entry point.
- **`scripts/e2e/run-shards.ts`** — Consumes `failScript` as the top-level rejection handler for its script entry point.
- **`scripts/mutation/run-tests.ts`** — Consumes `failScript` as the top-level rejection handler for its script entry point.

## Notes

- Deliberately avoids `import` of any project module; keep it that way if you touch it, or the isolation guarantee stated in the doc comment breaks.
- Sets `process.exitCode` rather than calling `process.exit()`, so pending I/O can flush before the process actually terminates.
- Only logs to `stderr` via `console.error`; it does not use the project logger.
