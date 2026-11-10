---
source: src/modules/products/translations-body.ts
sha256: 151b5cf81f97a0096707efdc1f99c599a4db4b71728c5ee7489559a1c59036e3
signature: 9fef486a7df3952c743fbe51cfb4ad579309dc17fb08edbdcc701c594b590392
generated_at: 2026-11-10T05:33:27.999339+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/translations-body.ts

## Purpose

Transforms the product form's per-locale translation entries into the exact JSON body the API contract expects, handling the difference between creating a new product (omit blank fields) and patching an existing one (explicitly send `null` to clear fields).

## Key elements

- **`isBlank`** (internal) — Returns `true` when a description is `undefined`, empty, or whitespace-only.
- **`toCreateTranslations`** — Builds the `POST /products` body. Blank descriptions are omitted entirely; a locale whose entry is `null` is dropped from the output (nothing to clear on a new product).
- **`toPatchTranslations`** — Builds the `PATCH /products/{id}` body (RFC 7396 JSON Merge Patch). Blank descriptions are sent as `null` (the only way to clear them); a locale whose entry is `null` is kept as `null` (deletes that locale on the server).

## Relationships

- **`ProductCreate.vue`** — Consumes `toCreateTranslations` to serialize the form before submitting a new product.
- **`ProductEdit.vue`** — Consumes `toPatchTranslations` to serialize the form before submitting an update.
- **`translations-body.spec.ts`** — Unit-tests both exported functions and the `isBlank` helper.

## Notes

- The API contract enforces `minLength: 1` on description strings, so this module never sends an empty or whitespace-only string — it either omits the key (create) or sends `null` (patch).
- The `null`-as-locale-entry convention (delete a locale) is only meaningful on PATCH; on CREATE it is silently dropped.
- Both functions are pure and synchronous — no side effects, no async I/O.
