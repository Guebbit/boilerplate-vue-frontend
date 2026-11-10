---
source: tests/unit/ui/use-row-actions.spec.ts
sha256: a83d82c3ccbfd4ead1fdafe42272a8254bb24b9d199adc530dae2873b2f9d46b
signature: fdc625723e7a8ec9c34348a04429adde3ef30fc20f6b3fc9ffadafa374143aa3
generated_at: 2026-11-10T08:31:36.103788+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-row-actions.spec.ts

## Purpose
Unit tests for the `useRowActions` composable. Verifies the `run` pipeline (clear alert → write → toast → follow-up), that failures are reported to the alert sink without rethrowing, and that `runConfirmed` gates the entire pipeline behind a confirm dialog (including a "no" short-circuit and concurrent-call deduplication).

## Key elements
- **`addMessageMock`** — hoisted (`vi.hoisted`) spy standing in for `useNotificationsStore().addMessage`; reset in every `beforeEach`.
- **`vi.mock('@guebbit/vue-toolkit')`** — partial mock that spreads the real module and replaces only `useNotificationsStore`.
- **`makeSink(calls)`** — factory returning a spy-based alert object (`report`, `clear`) that also appends to a shared `calls` array so tests can assert exact step ordering.
- **`describe('useRowActions — run')`** — three tests: happy-path order, failed write (no toast/follow-up, error reported), failed follow-up (toast still fires, then error reported).
- **`describe('useRowActions — runConfirmed')`** — four tests: confirm dialog receives `{ message, color: 'error' }`; "no" skips even the alert clear; "yes" runs the full pipeline; two concurrent calls result in a single `confirm` and a single `action` invocation.

## Relationships
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but no import or reference to it is visible in this test file; any connection is indirect (likely through a transitive dependency of `use-row-actions` or `vue-toolkit`).

## Notes
- `vi.hoisted` is required so `addMessageMock` exists before the `vi.mock` factory body executes (Vitest hoists `vi.mock` above imports).
- Tests assert **exact array order** (`toEqual(['clear', 'write', 'toast:Done', 'reload'])`) rather than individual `toHaveBeenCalled` checks, making step-sequence regressions visible.
- The concurrent-call deduplication test (`Promise.all` on two `runConfirmed` calls) pins a non-obvious guard: the composable must coalesce duplicate confirmations so the user is not double-prompted and the action is not executed twice.
- `useDialogStore().confirm` is overwritten per-test rather than spied on, so each test controls the return value independently.
