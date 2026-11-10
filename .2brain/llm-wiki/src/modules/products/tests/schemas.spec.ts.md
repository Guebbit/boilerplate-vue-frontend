---
source: src/modules/products/tests/schemas.spec.ts
sha256: f4adff731ab30767e89450b44df8e18e783269687feb22fd8a8a5e8058a17ad2
signature: 6261cd08af9ab97469554eccb0beeeae0ff8a4e86e560b2ada4164ab92bffccd
generated_at: 2026-11-10T05:31:15.504737+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/schemas.spec.ts

## Purpose

Vitest suite that pins down the **shape rules** of `productsSchema` — specifically the `price` format and the per-locale `translations` structure. It is the companion to `schemas-i18n.spec.ts` (which covers error *messages*); this file covers the *rules* themselves.

## Key elements

- **`validProduct`** – minimal valid payload used as the mutation base for nearly every assertion.
- **`describe('productsSchema')`** – top-level suite. Covers:
  - Acceptance of a minimal valid product.
  - Price format: accepts non-negative decimal strings (`'0'`, `'1.500'`, `' 5 '`), rejects negatives, scientific notation, non-decimals, and empty string.
  - Price type: must be a **string**; a bare number fails.
  - Missing `price` or missing `translations` is rejected; an empty `translations: {}` is accepted.
  - Optional fields (`id`, `active`, `requiresShipping`, `onHand`, `imageUrl`, `createdAt`, `updatedAt`) accept both `null` and `undefined` (see Notes).
  - `imageUrl`: empty string rejected, `null` accepted.
  - Optional fields pass through `parse` unmodified.
- **`describe('translations — one locale slot')`** – per-locale rules:
  - Title required and non-empty; description optional.
  - Each locale validated independently (one bad title doesn't mask another).
  - A locale slot may be `null` (the "delete" signal) without triggering the title rule.
  - Error `issues[].path` includes the locale key (e.g. `['translations','it','title']`) so the UI can attribute the error to the correct tab.
  - A locale slot that is neither an object nor `null` is rejected.
- **`withTitle(length)`** – helper that builds a valid product with an English title of exactly `length` characters.
- **`describe('productsSchema title bound')`** – boundary test: accepts a title at `createProductBodyTranslationsTitleMax`, rejects one character past it.

## Relationships

- **`src/modules/products/schemas.ts`** – the sole import under test. Exports `productsSchema` (Zod schema) whose `safeParse` and `parse` methods are called by every assertion in this file.

## Notes

- **Price is a string, not a number.** The form binds a text `<input>`; a numeric value on the wire indicates a serialization bug. The schema enforces this with a Zod string schema + regex, and the test asserts `price: 10` (number) is rejected.
- **`nullish`, not `optional`.** All server-supplied fields use `.nullish()` so they accept both `null` (what the API returns for unset fields) and `undefined`. A schema using only `.optional()` would reject its own GET response.
- **Empty `translations` is valid by design.** "No tab open" is a form-flow concern, not a schema constraint; the schema accepts `{}`.
- **`null` as a locale value is the delete signal.** It bypasses the title/description sub-schema entirely.
- **Title max is contract-derived, not hardcoded.** The boundary test reads `createProductBodyTranslationsTitleMax` from `@api/schemas`, so updating the API contract automatically shifts the test's acceptance threshold.
