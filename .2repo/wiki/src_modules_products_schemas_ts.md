# src/modules/products/schemas.ts

## Purpose

Defines the Zod validation schema for the product create/edit form. It mirrors the server's API contract constraints (notably the price minimum) so client-side validation is never more permissive than the backend.

## Key elements

- **`productsTitleSchema`** (module-private) — `z.string().min(1)` with a translated "required" error message.
- **`productsPriceSchema`** (module-private) — `z.number().min(createProductBodyPriceMin)` pulling the floor value directly from the generated API schema.
- **`productsSchema`** (exported) — `z.object` combining the above with `id`, `description`, `active`, `imageUrl`, `createdAt`, `updatedAt` all declared as `.nullish()`. Title and price are the only required fields.

## Relationships

No graph neighbors are listed for this file. It is a leaf consumer of `zod`, `@/infrastructure/i18n` (`translate`), and `@api/schemas` (`createProductBodyPriceMin`).

## Notes

- Error messages are **thunks** (`() => translate(...)`) rather than static strings. This defers i18n resolution to parse time so the correct locale is always picked up, even if the module was imported before the locale was set.
- `id` is `.nullish()` (not required), making the same schema usable for both create (id = null) and edit (id present) flows.
- The price minimum is sourced from the generated API contract (`createProductBodyPriceMin`), keeping the form in lockstep with the server without hard-coding a number.
