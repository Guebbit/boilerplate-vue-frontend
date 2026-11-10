---
source: tests/unit/scripts/pairing/paired-backend-path.spec.ts
sha256: be95bf47bcf8a657538c06c2d6006a2cd999bc75e32871a061b7e29826f50499
signature: 56e598251fdb7404318549753993ec5a19223f647d7dc2a0717b52a33a38b8ba
generated_at: 2026-11-10T08:22:30.461111+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/pairing/paired-backend-path.spec.ts

## Purpose

Unit tests for `scripts/pairing/paired-backend-path.ts`, verifying the resolution order (shell env → `.env` file → sibling-directory default) and the placeholder-substitution helpers for demo/reset commands. Every case runs in a throwaway temp directory so the checkout's real `.env` never leaks into assertions.

## Key elements

- **`sibling()`** – helper that computes the sibling-directory path from the current temp working directory.
- **`writeEnvironmentFile(contents)`** – helper that writes a `.env` file into the working directory for the current case.
- **`describe('resolveBackendPath')`** – covers the core resolver: unset/empty/whitespace fallback, relative vs. absolute overrides, `.env` parsing (including `KEY = value` spacing), shell-wins-over-file priority, and the guarantee that `.env` keys are never merged into `process.env`.
- **`describe('resolveLiveResetCommand')`** – covers `{backend}` and `{describeTo}` placeholder substitution; returns a string (shell-executed) or `undefined` when unset.
- **`describe('resolveBackendDemoCommand')`** – covers `{backend}` substitution; returns an **argv array** (for `spawn` without a shell) or `undefined`; guarantees no empty-string arguments.
- **`describe('resolveBackendDemoShardLimit')`** – covers numeric parsing; only positive integers are accepted—zero, negatives, fractions, non-numerics, and whitespace all yield `undefined`.
- **`beforeEach` / `afterEach`** – create a `mkdtempSync` directory, mock `process.cwd`, stub `BACKEND_PATH` to `undefined`, and clean up after each case.

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** – the module under test. The spec imports `DEFAULT_BACKEND_PATH`, `LIVE_SCENARIO_FILE`, `resolveBackendPath`, `resolveLiveResetCommand`, `resolveBackendDemoCommand`, and `resolveBackendDemoShardLimit` directly from it.

## Notes

- The header comment explicitly mirrors `tests/unit/scripts/pairing/paired-frontend-path.test.ts`; keep both in lock-step when the resolver contract changes.
- The empty-value trap is the most important edge case: `BACKEND_PATH =` (as shipped in `.env-example`) produces `''`, which `??` would let through to `path.resolve(cwd, '')` — i.e. the frontend repo itself. Tests assert the result is **not** `process.cwd()`.
- `resolveBackendDemoCommand` returns an argv **array**, not a string, because the backend is spawned without a shell; a string form would swallow the stop-signal.
- `resolveLiveResetCommand` returns a **string** (shell form) because it is executed via `npm --prefix … run …`.
