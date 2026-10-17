---
source: src/modules/products/tests/schemas.spec.ts
sha256: 13759dad63c14806bc6e3204a8232c63a68e87fd19cd67a31521fc486a4bc0a1
generated_at: 2026-10-17T01:34:10.292184+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/schemas.spec.ts

## Purpose

Vitest spec for `productsSchema` (the Zod form schema in `../schemas.ts`). It asserts structural and boundary rules for the product form payload—price constraints, translation slot validation, and nullish optional fields. Internationalization *messages* are explicitly out of scope (handled in `schemas-i18n.spec.ts`).

## Key elements

- **`validProduct`** — shared base payload (`price: createProductBodyPriceMin + 1`, one `en` locale with a title) that individual tests mutate by spreading and overriding one field.
- **Price boundary tests** — assert acceptance at exactly `createProductBodyPriceMin` and rejection at `createProductBodyPriceMin − 0.01`, plus rejection of negative and string prices.
- **Nullish-optional field tests** (`it.each` over `id`, `active`, `requiresShipping`, `onHand`, `imageUrl`, `createdAt`, `updatedAt`) — verify both `null` and `undefined` are accepted.
- **`imageUrl` tests** — empty string rejected; `null` is the only valid "clear" value.
- **`translations` sub-`describe`** — covers per-locale title validation, independent validation across locales, `null` as a delete signal (bypasses title rule), issue-path locale naming, and rejection of non-object/non-null slot values.
- **Empty translations map** — `{}` is valid; the schema does not enforce "at least one locale."

## Relationships

- **`src/modules/products/schemas.ts`** — the file under test; imports `productsSchema` and exercises its `safeParse` / `parse` output.
- **`@api/schemas`** — imports `createProductBodyPriceMin` so the price boundary is sourced from the API contract rather than hardcoded, keeping the form schema from drifting looser.
- **`schemas-i18n.spec.ts`** (sibling) — owns validation-message tests; this file's header explicitly delegates that concern there.
- **`translation-tab-errors.ts`** (referenced in comment) — downstream component that reads the locale name from the issue path to attribute errors to the correct tab.

## Notes

- **`nullish` ≠ `optional`**: the schema uses `nullish` on read-model fields because the API returns `null` for unset values; a plain `optional` (undefined-only) would reject the API's own GET response.
- **Price is typed as `number`, not `z.coerce.number()`**: a string input means upstream coercion was dropped; the test enforces this so the bug surfaces at the schema boundary.
- **Issue path includes the locale key** (e.g. `['translations', 'it', 'title']`), not just `['translations', 'title']`—components rely on this to map errors to the correct language tab.
- **`null` in a locale slot is a delete signal**, not a validation target; the title rule is intentionally not applied to it.
