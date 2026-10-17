---
source: src/modules/returns/tests/return-staff-actions.spec.ts
sha256: c62bf79f21d93b90934a0fa469aa0d4b735eee8171bf0f6022e94d351ecaf1b4
generated_at: 2026-10-17T01:38:39.342697+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/return-staff-actions.spec.ts

## Purpose
Vitest spec for `ReturnStaffActions.vue`. Verifies that the component renders staff action controls (approve, decline, receive) strictly from `Return.actions`, and that each control dispatches the correct payload to the store. Store methods are spied; network/transport concerns are deliberately left to `store.spec.ts`.

## Key elements
- **`mountActions(item: Return)`** — Test-scoped mount helper. Creates a fresh Pinia instance, spies on `store.approve` / `store.decline` / `store.receive` (each resolving with `aReturn()`), then mounts `ReturnStaffActions` with Vuetify + i18n. Returns `{ wrapper, store }` for assertions.
- **`beforeEach`** — Resets Pinia (`setActivePinia(createPinia())`) and loads the `'en'` locale.
- **`describe('ReturnStaffActions')`** — Nine tests covering:
  - No action controls rendered when all `actions` flags are absent.
  - Approve: clicks fire `store.approve('r1')` and emit `'changed'`.
  - Decline validation: submitting without a reason does **not** call `store.decline`.
  - Decline with reason: calls `store.decline('r1', 'Worn')`.
  - Receive (no deduction): calls `store.receive('r1', undefined)`.
  - Receive (with deduction): parses `'4.5'` → `{ handlingDeduction: 4.5 }`.
  - Server rejection (approve): no `'changed'` emit; `[data-test=return-move-error]` appears.
  - General error display (decline / receive rejection with a plain `Error`).
  - Field-level 422 error: message lands on the specific input (`return-receive-deduction`), general error slot is absent.

## Relationships
- **`src/modules/returns/components/ReturnStaffActions.vue`** — The SUT. Mounted, queried by `data-test` attributes, and asserted on for DOM state and emitted events.
- **`src/modules/returns/store.ts`** — Source of `useReturnsStore`. Its three action methods are spied to capture call arguments; no real HTTP is exercised here.
- **`tests/support/unit/fixtures.ts`** — Provides the `aReturn()` factory (default id `'r1'`, overridable `status` / `actions`) used to build the `item` prop.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module load (top-level, outside `beforeEach`) to register module aliases so relative imports inside the component resolve under Vitest.

## Notes
- The file's header comment is the contract: **store calls are spied; transport belongs to `store.spec.ts`**. Don't add network mocks here.
- `wireModulesIntoCore()` runs at import time, not per-test. If it mutates global state, ordering matters when this file runs alongside other specs in the same worker.
- The 422 error test uses a specific response shape (`success`, `status`, `errors[].field` / `errors[].details.field`). The component maps `field` to the matching input's error slot; if the API error contract changes, this test is the first to break.
- Element selectors rely entirely on `data-test` attributes, not on Vuetify class names — safe against UI-library version bumps.
