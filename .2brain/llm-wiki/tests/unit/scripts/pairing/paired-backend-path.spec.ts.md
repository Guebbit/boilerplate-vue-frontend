---
source: tests/unit/scripts/pairing/paired-backend-path.spec.ts
sha256: bf77823a025ed0f60fe907ab105c05f8413c9f3669eddcd68e7257138a2f1963
generated_at: 2026-10-17T02:45:01.004524+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/pairing/paired-backend-path.spec.ts

## Purpose

Unit tests for `scripts/pairing/paired-backend-path.ts`, covering the resolution order (shell env → `.env` file → sibling-directory default), the empty/whitespace guard that prevents `''` from collapsing to the repo root, and the three command/limit resolvers that substitute `{backend}` and `{describeTo}` placeholders. Every case runs in a throwaway temp directory with a mocked `process.cwd()` so the checkout's own `.env` never contaminates expectations.

## Key elements

- **`describe('resolveBackendPath')`** — Verifies fallback to `DEFAULT_BACKEND_PATH` when unset, empty/whitespace treated as unset, relative vs. absolute overrides, `.env` parsing (including `KEY = value` spacing), shell-over-`.env` precedence, and that `.env` keys are *not* merged into `process.env`.
- **`describe('resolveLiveResetCommand')`** — Confirms `undefined` when unset or blank, `{backend}` substitution (Node and PHP spellings), and `{describeTo}` → `LIVE_SCENARIO_FILE`.
- **`describe('resolveBackendDemoCommand')`** — Same unset/blank guard; asserts the result is an **argv array** (safe for `spawn` without a shell), `{backend}` substitution, and that no empty-string arguments survive multi-space input.
- **`describe('resolveBackendDemoShardLimit')`** — `undefined` for unset, blank, non-numeric, `0`, negative, and fractional values; numeric string → `number`.
- **`beforeEach` / `afterEach`** — Creates a `mkdtemp` dir, mocks `process.cwd()`, deletes the four `BACKEND_*`/`LIVE_*` env vars; restores originals and removes the temp dir after each case.
- **`sibling()`** — Helper that computes the expected sibling path relative to the current temp dir.
- **`writeEnvironmentFile(contents)`** — Helper that writes a `.env` into the temp dir for `.env`-reading tests.
- **Module-level saved vars** (`previous`, `previousDemoCommand`, `previousResetCommand`, `previousShardLimit`) — Captured once at import time so `afterEach` can restore the developer's real shell values.

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — The module under test. This spec imports `DEFAULT_BACKEND_PATH`, `resolveBackendPath`, `resolveLiveResetCommand`, `resolveBackendDemoCommand`, `resolveBackendDemoShardLimit`, and `LIVE_SCENARIO_FILE` from it.

## Notes

- The empty-value guard is the file's central concern: `??` alone would let `''` pass to `path.resolve(cwd, '')`, yielding the repo root and causing a false "backend missing" report. The tests explicitly assert `resolveBackendPath() !== process.cwd()` for the `''` and `'   '` cases.
- `resolveBackendDemoCommand` intentionally returns an **argv array** rather than a shell string so that the backend process receives signals (SIGTERM, etc.) directly; a shell intermediary would swallow them.
- The `.env` file is read by the resolver itself because `npm run` does not source it. The tests confirm that reading `.env` does **not** pollute `process.env`.
- The header comment states this file mirrors `tests/unit/scripts/pairing/paired-frontend-path.test.ts` on the backend side.
