# src/modules/orders/schemas.ts

## Purpose

Defines Zod validation schemas for the order form, with i18n error messages deferred to parse time so that the active locale is resolved when a value is actually validated, not at module-import time.

## Key elements

- **`ordersStatusSchema`** – `z.enum(OrderStatus)` with a thunked error message (`translate('orders-form.status-invalid')`).
- **`ordersSchema`** – `z.object` covering all order-form fields (`id`, `userId`, `email`, `status`, `totalPrice`, `notes`, `createdAt`, `updatedAt`). Every field is `.nullish()`, allowing partial/partial-update payloads.
- **`translate` (imported from `@/infrastructure/i18n`)** – called inside `error: () => …` thunks so the message string is only resolved when validation actually fails.

## Relationships

- **`src/modules/orders/tests/schemas-i18n.spec.ts`** – spec file that exercises these schemas, specifically verifying that i18n error messages resolve correctly at parse time.

## Notes

- Error messages are **thunks** (`() => translate(…)`), not plain strings. This is intentional: the locale may not be set at the point the schema is defined (module load), so the translation is deferred until `.parse()` is called.
- Because every field is `.nullish()`, passing an empty object `{}` is a valid `ordersSchema` parse. Callers who require at least one field must add a `.refine()` or use a different schema.
- `email` uses `z.email()` (Zod v4 API) rather than `z.string().email()`; make sure the project's Zod version supports this.
