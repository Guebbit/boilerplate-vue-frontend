---
source: src/modules/orders/schemas.ts
sha256: d7ca66c1345e5b4e319ffcca12ec3dd4066a1e1f6b7afcdb168eaec6e086d598
generated_at: 2026-10-17T01:16:10.114859+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/schemas.ts

## Purpose

Defines Zod validation schemas for the order creation/edit form. Error messages are i18n-thunked (resolved at parse time via `translate()`) so that the UI language can change without re-evaluating the schema definitions.

## Key elements

- **`ordersStatusSchema`** — `z.enum(OrderStatus, …)` with a thunked i18n error message (`orders-form.status-invalid`). Validates that a given value is one of the known `OrderStatus` constants imported from `@api`.
- **`ordersSchema`** — A `z.object` covering all order form fields (`id`, `userId`, `email`, `status`, `totalPrice`, `notes`, `createdAt`, `updatedAt`). Every field uses `.nullish()` (except `email`, which is `.optional()`), making the schema suitable for both full and partial updates.

## Relationships

- **`src/modules/orders/views/OrderEdit.vue`** — Consumes `ordersSchema` (and transitively `ordersStatusSchema`) to validate form input before submitting order create/update requests.
- **`src/modules/orders/tests/schemas-i18n.spec.ts`** — Unit-tests the schemas, specifically verifying that the thunked `translate()` calls produce correct localized error strings at parse time.

## Notes

- **Thunked errors, not static strings.** The `error` option on every field is a `() => translate(…)` function, not a literal string. This is intentional: the schema objects are created once at module load, but the active locale may change later. Passing a thunk defers resolution to each `.parse()` call.
- **`email` uses `.optional()` while every other field uses `.nullish()`.** In practice both accept `undefined`, but only the `.nullish()` fields also accept `explicit null`. If you add a new field, match the existing convention (`.nullish()`) unless the field genuinely cannot be `null`.
- **`OrderStatus` is imported from `@api`**, not defined locally. The enum values come from the API client package, so adding a new status requires an upstream change there.
