---
source: src/modules/payments/tests/use-order-refund.spec.ts
sha256: 6846cd7732ea8a1b02d98001104a4acf98f0149b9d3f9c4d05698110448e00e0
signature: ba56383469d29d9c46183cc2e9a6ecb21adafcfd4eee1ee3df77f18419d8222d
generated_at: 2026-11-10T05:17:56.083419+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/use-order-refund.spec.ts

## Purpose

Vitest spec for the `useOrderRefund` composable. It pins the behavioral contract that the composable **decides nothing**: refund availability is always read back from the server's `actions.refund` field, amount formatting follows a fixed two-decimal shape, and failure paths produce operator-facing warnings rather than unhandled rejections.

## Key elements

- **`payment(refund, owed?)`** – Local fixture builder. Returns a payment object whose `actions.refund` boolean and `refunds` array (derived from `owed` ids) drive the composable's state.
- **`responses`** – Module-level `Record<string, unknown>` holding canned HTTP bodies keyed by `"METHOD /url"`. Each test (or `beforeEach`) sets the stubs it needs before acting.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a function that looks up `responses`; unknown keys reject with `aProblem(404, …)` matching the store's error-envelope contract.
- **`settled()`** – `Promise.resolve().then(…)` microtask flush that lets the composable's immediate watcher resolve before assertions run.
- **Test cases** cover: failed read → toast + control closed; `canRefund` true when server allows; `canRefund` false after a successful refund refreshes the record; amount string normalization (`"7"` → `"7.00"`); refund refusal → warning naming the next step; settleable list populated from `actions.settleByHand` and emptied after settle; empty payment list → no control; `ref(undefined)` → no-op without a broken URL.

## Relationships

- **`src/modules/payments/composables/use-order-refund.ts`** – The system under test; every assertion targets the reactive values and `refund`/`settle` functions it exposes.
- **`tests/support/unit/fixtures.ts`** – Supplies `aProblem`, the shared error-envelope builder used by both the mock's 404 fallback and explicit failure stubs.
- **`tests/support/unit/orval-fixture-schema.ts`** – Provides `parseOrvalFixture`, which validates each canned response body against the Orval-generated schema before it is returned, catching fixture drift.
- **`tests/support/unit/wire-modules.ts`** – Called once at module scope (`wireModulesIntoCore()`) to register the i18n / store / HTTP modules the composable expects in the Pinia container.

## Notes

- The composable uses an **immediate watcher** that fires on setup; the `settled()` helper (a single microtask tick) is sufficient, but any test that chains further async work (e.g. `refund()` then re-read) must thread the promise chain explicitly rather than relying on `flushPromises` alone.
- The refusal test calls `loadLocale('en')` before asserting on the warning text; without it the i18n string is not yet available and the `toContain` check would fail.
- `vi.clearAllMocks()` in `beforeEach` resets `orvalMutator` call history, but `responses` is **reassigned** (not cleared) — a test that needs a different set of stubs must overwrite the relevant keys explicitly.
- The `ref(undefined)` guard test exists to prevent a regression where a missing `orderId` would produce a malformed URL (`/payments/undefined/refunds`) instead of a safe no-op.
