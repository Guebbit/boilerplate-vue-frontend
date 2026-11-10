---
source: src/modules/products/schemas.ts
sha256: 6547e2912877c8416632c0c5182868119b1229a44829db0d5da2720d6b7714d0
signature: f83758a046bbe3c43bb6f9f3907076dcee62fc97743f565faabaebe30f3f08c5
generated_at: 2026-11-10T05:22:01.311748+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/schemas.ts

## Purpose

Defines Zod validation schemas for the product create/edit forms. Schemas are derived from the API contract's own constraints (regex, max lengths) so the client never validates more loosely than the server. Also encodes the API's three-signal translation model (upsert / delete / leave-untouched) in a single shape.

## Key elements

- **`productsTitleSchema`** (internal) — string, `min(1)`, `max` from `createProductBodyTranslationsTitleMax`.
- **`productsPriceSchema`** (internal) — takes the raw typed string, runs `normalizeAmount(typed, getCurrentLocale())`, then pipes through a regex check using `createProductBodyPriceRegExp`.
- **`productTranslationFieldsSchema`** (internal) — `{ title, description? }` mirroring the API's `ProductTranslationFields`. `description` is `.optional()` (not `.nullish()`); omitting the key is the "unset" signal.
- **`productTranslationSlotSchema`** (internal) — `productTranslationFieldsSchema.nullable()`. `null` means "delete this locale" and intentionally skips title/description validation.
- **`productTranslationsSchema`** (exported) — `z.record(z.string(), productTranslationSlotSchema)`. One entry per BCP 47 locale tab open in the form. Error paths are `['translations', <locale>, <field>]`.
- **`productsSchema`** (exported) — the full form object: `price` (required), `translations` (required), and all other fields `.nullish()`. Includes `imageUrl` as `z.string().min(1).nullish()` (`null` clears, `''` is invalid).

## Relationships

- **`ProductCreate.vue` / `ProductEdit.vue`** — parse the form state with `productsSchema.safeParse(...)`, then group the resulting `error.issues` by `issue.path[1]` (the locale) to render per-tab error badges.
- **`schemas.spec.ts`** — unit tests for schema pass/fail cases against the API contract values.
- **`schemas-i18n.spec.ts`** — verifies that error messages resolve to the correct translated string for a given locale (validates the thunk pattern).

## Notes

- **Error messages are thunks** (`() => translate(...)`), not static strings. They resolve at `parse()` time so the message follows whatever locale is active then. Do not replace with eager strings.
- **Price is a string, not a number.** The schema validates the normalized *string* form against the contract regex. Decimal-place enforcement is the server's job.
- **`z.record` iterates only keys present in the input.** A locale the form never opened produces no issues; this matches the API's "absent key = leave alone" semantics and requires no extra schema arm.
- **`description` is `.optional()`, not `.nullish()`.** The write contract has no `null` arm for description; sending `null` would be a contract violation.
