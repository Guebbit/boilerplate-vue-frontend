---
source: src/modules/payments/tests/payments-list-refused-refund.spec.ts
sha256: 59ddb57c25a050b105ad8c1451a9e77342915c71e2c95c4e8eb59b8ca1849fce
signature: 993f2adb12d9d3c97d13b385676c194b477507ce5602a4aca3aed2cd60052b8a
generated_at: 2026-11-10T05:15:31.521413+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payments-list-refused-refund.spec.ts

## Purpose

Integration test verifying that when a provider refuses a refund, the payment drawer remains open and displays the **re-read** payment state (including the refused refund's failure reason) rather than the stale row data the drawer was originally opened on. Only the table and navigation-drawer chrome are stubbed; the drawer body under test is the real component.

## Key elements

- **`wireModulesIntoCore()`** (module scope) — registers enabled modules into the kernel so route collection and i18n work before the test runs.
- **`router`** — a `createMemoryHistory` router built from `collectModuleRoutes(enabledModules)`, giving the test a real route tree.
- **`ROW`** — an `aPayment` fixture with `refund: true` and all other actions off; represents the row the drawer is opened on.
- **`REREAD`** — an `aPayment` fixture identical to `ROW` plus one `refunds` entry with `status: 'failed'` and `failureReason: 'insufficient_funds'`; represents the server response after refusal.
- **`beforeEach`** — resets Pinia, pushes `/en/sales/payments`, and loads the `en` locale.
- **Single test** — *"shows a refused refund's reason in the drawer it left open"*:
  1. Mocks `usePaymentsStore().refundPayment` to resolve with `REREAD`.
  2. Mocks `useDialogStore().confirm` to resolve `true`.
  3. Mounts `PaymentsList` with `PaymentsTable` and `VNavigationDrawer` stubbed.
  4. Emits `select` with `ROW` to open the drawer; asserts no failure-reason element exists yet.
  5. Clicks `[data-test="drawer-refund"]`; asserts `[data-test="drawer-failure-reason"]` renders "Insufficient funds".

## Relationships

- **`src/modules/payments/views/PaymentsList.vue`** — the component under test; mounted with its real drawer sub-tree.
- **`src/modules/payments/store.ts`** — `usePaymentsStore().refundPayment` is spied on to simulate the refused-refund API response.
- **`tests/support/unit/fixtures.ts`** — provides the `aPayment` factory used to build `ROW` and `REREAD`.
- **`tests/support/unit/mounted-vm.ts`** — provides `emitOn` to dispatch the `select` event on the stubbed table.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore` so module-registered routes and i18n are available before mount.

## Notes

- `wireModulesIntoCore()` runs once at **module scope**, not in `beforeEach`; it mutates global kernel state and is not idempotent across files in the same worker.
- The test relies on `data-test` attributes (`drawer-refund`, `drawer-failure-reason`) that must exist in the real drawer template—breaking those in the component silently breaks this test with a generic "not found" error.
- The i18n assertion (`'Insufficient funds'`) implicitly couples the test to the English locale and to the translation key mapped from `failureReason: 'insufficient_funds'`; a locale or key rename will surface as a text-mismatch failure.
