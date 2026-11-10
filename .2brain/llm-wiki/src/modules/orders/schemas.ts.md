---
source: src/modules/orders/schemas.ts
sha256: 02d1de40e5aea9c8d4633f9e9f62a2bb9b862dcaff5d486ee479f93702ecaa84
signature: 07065729fa00c4a9994225eda71857c5e8da2e9ff9e6aa6ccb158e347ddd2968
generated_at: 2026-11-10T05:00:17.784548+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/schemas.ts

## Purpose

Defines Zod validation schemas for order-related forms. Error messages are i18n thunks (resolved at parse time via `translate`) so they work regardless of which locale is active when the schema was constructed.

## Key elements

- **`ordersSchema`** – Validates a full order object. All fields are `.nullish()` (or `.optional()` for `email`) to support both create and partial-update flows.
- **`shippingAddressCorrectionSchema`** – Validates the "correct shipping address" payload. Five required text fields (`fullName`, `street`, `city`, `zip`, `country`) and one optional `phone`.
- **`addressText(max)`** *(internal)* – Builds a `.trim().max(max)` string schema with a length-capped error message. Empty strings pass; presence is the caller's responsibility.
- **`requiredAddressText(max)`** *(internal)* – Wraps `addressText` with `.min(1)` to enforce non-empty input.

## Relationships

- **`@api/schemas`** – Imports the five `correctOrderShippingAddressBodyOne*Max` constants that cap field lengths, keeping the UI schema in sync with the API contract.
- **`@/i18n`** – Imports `translate`, used as a thunk in every error message so the correct locale string is produced at validation time.
- **`src/modules/orders/components/ShippingAddressForm.vue`** – Consumes `shippingAddressCorrectionSchema` to validate operator input before submitting a correction.
- **`src/modules/orders/views/OrderEdit.vue`** – Consumes `ordersSchema` for order create/edit form validation.
- **`src/modules/orders/tests/schemas.spec.ts`** – Unit tests covering field-level validation rules.
- **`src/modules/orders/tests/schemas-i18n.spec.ts`** – Unit tests covering locale-specific error message resolution.

## Notes

- `email` in `ordersSchema` uses `.optional()` (absent is fine, but if present must be non-null) while every other field uses `.nullish()` (absent **or** `null` is fine). Don't conflate the two when extending the schema.
- The `phone` field in `shippingAddressCorrectionSchema` is the only *optional* field there — it uses `addressText` (no `.min(1)`), so an empty string clears a previous value.
- `country` is validated with a bare `.trim().min(1)` rather than `requiredAddressText` because it comes from a fixed ISO 3166-1 select; there is no meaningful "too long" cap to enforce here.
- Length caps are sourced from `@api/schemas` constants, not hardcoded — if the API contract changes, update the constants there, not in this file.
