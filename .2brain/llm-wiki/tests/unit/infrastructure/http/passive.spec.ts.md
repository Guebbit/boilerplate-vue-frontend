---
source: tests/unit/infrastructure/http/passive.spec.ts
sha256: ea55881159f362be566d238212396153e82656c994b763f98a29e2350e782e65
signature: ea55881159f362be566d238212396153e82656c994b763f98a29e2350e782e65
generated_at: 2026-11-10T07:59:19.196776+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/passive.spec.ts

## Purpose

Unit tests for `asPassive`, the helper that injects a `Session-Passive: true` header into outgoing HTTP request configs. The tests lock in the merge contract so that every self-made read (refresh, abilities, notifications sync) is correctly marked as passive on the server without clobbering caller-provided options.

## Key elements

- **`describe('asPassive')`** — the sole test suite in this file.
- **`it('adds the header to an empty config')`** — asserts that calling `asPassive()` with no argument returns exactly `{ headers: { 'Session-Passive': 'true' } }`.
- **`it('keeps what the caller already set, headers included')`** — asserts that a pre-populated config (e.g. `{ timeout: 5, headers: { 'X-Other': '1' } }`) is preserved and the passive header is appended alongside existing headers, rather than replacing them.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The test file uses a JSDoc module comment that restates the intent of `asPassive`; the actual implementation lives in `src/infrastructure/http/passive.ts` (not under `tests/`).
- The merge is shallow: existing header keys are kept, and `Session-Passive` is set as a sibling key. If a caller already set `Session-Passive` to a different value, these tests do not cover that case — the expected behavior is simply overwritten to `'true'`.
- The import uses an explicit `.ts` extension (`@/infrastructure/http/passive.ts`), consistent with the project's ESM/NodeNext-style resolution.
