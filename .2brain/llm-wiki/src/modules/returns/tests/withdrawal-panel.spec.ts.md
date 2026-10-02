---
source: src/modules/returns/tests/withdrawal-panel.spec.ts
sha256: 8ca3053b3f6d2dc4cd17667fe05455072f3e9a248963bfc3f48b3ec0a7cb5e31
generated_at: 2026-10-02T15:46:41.688755+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/withdrawal-panel.spec.ts

## Purpose

Vitest unit tests for the `WithdrawalPanel` Vue component. Verifies the server-gated withdrawal button, its confirmation dialog flow, error reporting, and the nested `ReturnRequestForm` offering rules. Deliberately mocks the Pinia store's actions (transport is `store.spec.ts`'s responsibility) and the dialog store's `confirm` to isolate component logic.

## Key elements

- **`mountPanel(props, existing?)`** — Shared setup helper. Creates a fresh Pinia, spies on `fetchOrderReturns` and `openReturn` *before* mounting (the component destructures actions in `setup`), then mounts `WithdrawalPanel` with Vuetify, i18n, and a memory router. Returns `{ wrapper, store }`.
- **`router`** — Single-route memory-history router matching `/:locale/returns/:id` (name `ReturnTarget`) so `router-link` inside the panel resolves.
- **`SHIRT`** (inside `returns form` block) — A one-line `Order['items']` fixture (product `p1`, qty 1) used for the form-visibility tests.
- **Top-level `it` blocks** — Cover: hidden panel, button + deadline text, "delivered" fallback text, confirmed withdrawal (calls `openReturn` with `{orderId, reason:'withdrawal'}` and emits `opened`), declined confirmation (no call, no emit), server refusal (shows `[data-test=withdraw-error]`), and listing an already-opened return.
- **`describe('returns form')`** — Covers: form appears after `delivered`/`shipped` status, absent before shipping, hidden when all units are already in a return, and that emitting `opened` on the child `ReturnRequestForm` re-fetches the return list.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module load so the i18n / module registry is populated before any test runs.
- **`tests/support/unit/fixtures.ts`** — Provides `aReturn()` and `anOrder()` factory helpers used in `mountPanel`'s default mock return and in the returns-form tests.
- **`tests/support/unit/mounted-vm.ts`** — Provides `emitOn()`, used to programmatically trigger the `opened` event on the child `ReturnRequestForm` component via Vue Test Utils.

## Notes

- Store actions must be spied **before** `mount()` because `WithdrawalPanel` destructures them during `setup`; spying after mount would have no effect.
- The `existing` parameter of `mountPanel` is cast `as never` at call sites (`[aReturn()] as never`) — a pragmatic escape hatch for fixture typing; not a bug.
- `vi.mocked(store.openReturn).mockRejectedValue(...)` is used to *re*-configure the mock after `mountPanel` already set it, keeping the helper's default (`mockResolvedValue`) intact for other tests.
- The dialog store (`useDialogStore().confirm`) is spied per-test rather than in `mountPanel`, because only the withdrawal-click tests exercise it.
