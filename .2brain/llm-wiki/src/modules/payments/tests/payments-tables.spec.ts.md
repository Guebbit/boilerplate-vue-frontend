---
source: src/modules/payments/tests/payments-tables.spec.ts
sha256: ebdff69ca61b2045dba0eee15c4a0f171565c73ad23000aef1c1a058bd7c371c
signature: 0b53c61692cfd2994bb31641383e63fb35172309b01d8ebd12372f6cd9837cb9
generated_at: 2026-11-10T05:16:08.581519+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payments-tables.spec.ts

## Purpose

Unit-test suite for the three tab bodies of the staff payments page (all payments, awaiting transfers, refunds/attention). It mounts each table component with the Pinia store's read methods stubbed, then asserts what query parameters the component sends to the API and what it renders from the returned data. It also covers edge cases: empty results, failed reads, filter validation (non-numeric amounts dropped, `disputed` omitted when unchecked), sorting, and row-selection events.

## Key elements

- **`answerPaymentsWith`** – Spies `store.fetchPaymentsPage`, sets `paymentsPage`/`paymentsTotal`, returns the spy. Used to assert the exact query object the component sends.
- **`answerAwaitingWith`** – Same pattern for `fetchAwaitingPage` / `awaitingPage`.
- **`answerRefundsWith`** – Same pattern for `fetchRefundsPage` / `refundsPage`.
- **`answerAttentionWith`** – Same pattern for `fetchAttention` / `attention`.
- **`GLOBAL`** – Shared mount options: plugins (router, vuetify, i18n) and a `VNavigationDrawer` stub that renders only its slot, avoiding the `v-layout` requirement.
- **`router`** – A real Vue Router instance backed by `collectModuleRoutes(enabledModules)` so in-table order links (`/orders/:id`) resolve correctly.
- **`describe('AwaitingTransfersTable')`** – Verifies pagination call `(1, 10)`, row fields (reference, pay-by, amount, order link), empty state, and `select` event emission.
- **`describe('PaymentsTable')`** – Verifies rendered row cells (status, amount, provider, order link, customer), default page-1/no-filter query, full filter form submission (dates as instants, amounts as strings, whitespace trimming, `disputed` toggle), non-numeric amount rejection, Reset behavior, header-click sorting with page reset, inert columns, repeated row-click emission, empty state, and error-toast on a failed read.
- *(Truncated section)* – Additional `RefundsTable` / `AttentionList` tests follow the same stub-then-assert pattern.

## Relationships

- **`src/modules/payments/components/PaymentsTable.vue`**, **`src/modules/payments/components/RefundsTable.vue`**, **`src/modules/payments/components/AwaitingTransfersTable.vue`**, **`src/modules/payments/components/AttentionList.vue`** – The SUTs; each is mounted and interacted with via `data-test` selectors.
- **`src/modules/payments/store.ts`** (`usePaymentsStore`) – Its fetch methods are spied/mocked per test; the tests assert the store is called with the expected query shape and that its state fields are read by the components.
- **`tests/support/unit/fixtures.ts`** – Provides `aPayment` and `aProblem` factory functions used to build realistic store payloads without repeating object literals.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module load so the registry, router, and i18n are populated the same way the real app bootstraps them.

## Notes

- `VNavigationDrawer` is stubbed to a bare `<aside><slot/></aside>` because the real Vuetify drawer requires a parent `v-layout` that this suite does not render. Any test that depends on drawer visibility or animation will need this stub removed.
- Date filters are asserted as **local-time instants** (`new Date(2026, 2, 1)` etc.), not UTC strings — the component converts the `<input type="date">` value locally before calling the store.
- `amountMin` / `amountMax` are passed to the API as **strings** (e.g. `'10'`, `'99.5'`), not numbers; a negative or non-numeric entry is silently dropped (field omitted) rather than sent as `NaN`.
- The `disputed` filter key is **omitted entirely** (not `false`) when the checkbox is unchecked, so API consumers can distinguish "no filter" from "only non-disputed."
- Sorting is always restarted from **page 1**; the test asserts `page: 1` in the subsequent store call.
- The file is truncated in the sample; `RefundsTable` and `AttentionList` test blocks exist below the `PaymentsTable` suite and follow the same conventions.
