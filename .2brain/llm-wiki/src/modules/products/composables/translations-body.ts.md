---
source: src/modules/products/composables/translations-body.ts
sha256: 151b5cf81f97a0096707efdc1f99c599a4db4b71728c5ee7489559a1c59036e3
generated_at: 2026-10-02T15:32:47.940984+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/translations-body.ts

## Purpose

Transforms the product form's per-locale translation fields into the exact JSON body each API endpoint accepts. The two endpoints (POST create, PATCH update) treat "no description" differently — this file encodes that asymmetry so callers pass form state through without hand-rolling the mapping.

## Key elements

- **`isBlank`** (internal) — Returns `true` when a description is `undefined`, `''`, or whitespace-only. Not exported.
- **`toCreateTranslations`** — Shapes translations for `POST /products`. Omits the `description` key entirely when blank; drops locales whose entry is `null`.
- **`toPatchTranslations`** — Shapes translations for `PATCH /products/{id}` (RFC 7396 JSON Merge Patch). Converts blank descriptions to explicit `null` (the only way to clear a value); preserves `null`-valued locales so the server deletes them.

## Relationships

- **`src/modules/demo/tests/guards.spec.ts`** — Test spec that exercises the create/patch translation transforms (importing from this module).

## Notes

- **Create vs. PATCH asymmetry:** The same blank description is *omitted* on create but *sent as `null`* on PATCH. Mixing the two up will either fail validation (sending `''`) or fail to clear a value (sending nothing on a PATCH).
- **`null` locale entries are a delete signal.** A locale key mapped to `null` is not "missing data" — it instructs the server to remove that locale. Both transforms respect this.
- **`title` is always forwarded** (even if empty) in both transforms; only `description` gets the blank-handling treatment.
- Uses `Object.fromEntries` + `flatMap`/`map` over `Object.entries` rather than `for…in`, so key order follows the source object's insertion order.
