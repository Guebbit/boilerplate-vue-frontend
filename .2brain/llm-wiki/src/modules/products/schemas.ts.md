---
source: src/modules/products/schemas.ts
sha256: 59efd46c1b41c9588054913f8d2da5b73091b2fc8050d5ee9266a111ae9c8f56
generated_at: 2026-10-17T01:28:53.995914+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/schemas.ts

## Purpose

Zod validation schemas for the product create/edit forms. The constraints are derived from the API contract (e.g. price minimum) so the client never validates more loosely than the server. The translations sub-schema mirrors the API's `translations` map shape, producing Zod issue paths shaped as `['translations', <locale>, <field>]` that the Vue views consume directly.

## Key elements

- **`productsTitleSchema`** (internal) — `z.string().min(1)` with a thunked i18n error message.
- **`productsPriceSchema`** (internal) — `z.number().min(createProductBodyPriceMin)`; the minimum comes from `@api/schemas` so it stays in sync with the server contract.
- **`productTranslationFieldsSchema`** (internal) — `{ title, description? }` for a single locale. `description` uses `.optional()` (key-absent), not `.nullish()`, matching the API's `ProductTranslationFields` which has no `null` arm.
- **`productTranslationSlotSchema`** (internal) — `productTranslationFieldsSchema.nullable()`. A `null` value means "delete this locale" and intentionally bypasses field validation.
- **`productTranslationsSchema`** (exported) — `z.record(z.string(), productTranslationSlotSchema)`. Validates every locale key present in the form state; locales the form never opened produce no issues.
- **`productsSchema`** (exported) — The top-level form schema: scalar fields (price, booleans, numbers, string arrays, `imageUrl`, timestamps) plus `translations: productTranslationsSchema`. Most optional fields use `.nullish()`; `imageUrl` uses `.min(1).nullish()` because the contract rejects empty strings.

## Relationships

- **`ProductCreate.vue` / `ProductEdit.vue`** — Import `productsSchema` (and `productTranslationsSchema`), call `safeParse`, and group `error.issues` by `issue.path[1]` (the locale tag) to attach error badges to the correct language tab.
- **`tests/schemas.spec.ts`** — Unit-tests the validation logic of the exported schemas (pass/fail cases, path shapes).
- **`tests/schemas-i18n.spec.ts`** — Verifies that error messages resolve through the `translate()` thunk at parse time.
- **`@api/schemas`** — Source of `createProductBodyPriceMin`; the schema file delegates the numeric minimum to the shared API contract rather than hard-coding it.
- **`@/i18n`** — Provides `translate`, used inside error-message thunks so the correct locale string is resolved at parse time.

## Notes

- Error messages are **thunks** (`() => translate(...)`), not pre-computed strings. This defers i18n resolution to parse time so the active locale is always correct.
- The distinction between `.optional()` (key may be absent) and `.nullish()` (key may be absent **or** `null`) is load-bearing: `description` is `.optional()` only, while most other fields are `.nullish()`. Swapping them would change what the form considers valid.
- `releaseDate` is a plain `z.string().nullish()` here; the conversion to/from the API's wire format is handled elsewhere (the comment references `fromDateTimeLocal`).
- A `null` slot in `translations` means "delete this locale" per the API contract. A key **absent** from the map means "leave alone" — that third signal needs no schema arm.
