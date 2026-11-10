---
source: src/modules/payments/tests/e2e/actions.cy.ts
sha256: 5a80206ff4a2a85f9dc5c6f4325ca9e165893c98f21e61e083c18629319b4549
signature: d3b8b576d209065308a28044b3a472c1e1bd610ce44b41922adc1c41ebbf5146
generated_at: 2026-11-10T05:13:53.366107+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/e2e/actions.cy.ts

## Purpose

Declarative Cypress e2e tests that verify each payments list tab (All, Awaiting, Refunds, Attention) renders its empty-state UI when the corresponding API call returns an empty page. Each case intercepts the network request, stubs a schema-validated empty response, and asserts the screen shows the empty-state copy with zero rows.

## Key elements

- **`emptyPage`** – Shared constant for the standard paged empty response: `{ items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }`.
- **`actionTable('payments', [...])`** – The single test-table registration. Each row declares one scenario:
  - **All tab** – Intercepts `POST **/payments/search`; validates with `SearchPaymentsResponse`.
  - **Awaiting tab** – Same intercept/schema as All; different route (`?tab=awaiting`).
  - **Refunds tab** – Intercepts `GET **/payments/refunds?*`; validates with `ListRefundsResponse`.
  - **Attention tab** – Intercepts `GET **/payments/attention`; validates with `ListPaymentAttentionResponse`; uses a non-paged empty body (`{ items: [] }`).

## Relationships

- **`tests/support/e2e/action-table.ts`** – Provides the `actionTable` runner that consumes this file's declarative rows and generates the actual Cypress test cases (visit, stub, assert).
- **`contracts/rest/schemas.zod.ts`** – Source of the three Zod response schemas (`SearchPaymentsResponse`, `ListRefundsResponse`, `ListPaymentAttentionResponse`) used to schema-check the stubbed empty bodies.

## Notes

- The Attention tab's empty body is `{ items: [] }` (no `meta`), unlike the other three tabs which use the paged `emptyPage` shape. Don't "fix" it to match the others unless the backend contract changes.
- All four cases run as the `admin` persona; there is no non-admin coverage in this file.
- The file contains no `it()` / `cy.` calls directly — all test logic lives inside `actionTable`. To understand the assertion mechanics, read `action-table.ts`.
