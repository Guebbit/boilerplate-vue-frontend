---
source: tests/unit/infrastructure/utils/forms.spec.ts
sha256: 1502b80bd5b3f68fbcb7a52466959a7e398759758d7ec319de97074291ea1637
signature: 1502b80bd5b3f68fbcb7a52466959a7e398759758d7ec319de97074291ea1637
generated_at: 2026-11-10T08:05:49.018275+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/forms.spec.ts

## Purpose

Unit tests (Vitest) for the four form-shaping utilities exported from `@/infrastructure/utils/forms.ts`. The suite verifies that raw form values are translated into schema-valid request bodies: empty strings become explicit `null` clears, unchanged fields are dropped against a baseline, nested objects are diffed recursively, and multipart uploads are split from subsequent clear requests.

## Key elements

- **`shapeBody` (tested)** — Accepts a Zod schema, a raw form object, and an optional baseline. Translates `''` → `null` only when the schema's field type allows a null clear; omits fields the schema doesn't define; diffs against the baseline (treating `''`, `undefined`, `null` as one "empty" value); handles nested objects and arrays (deep comparison); passes through non-schema keys (e.g. `Blob` uploads).
- **`toRequestBody` (tested)** — Async; loads a named schema from `@api/schemas` by string key, then delegates to `shapeBody`.
- **`uploadThenClear` (tested)** — Splits a body into a non-null upload payload and a null-bearing clear payload. Sends the upload first; only if it resolves does it send the clear. If the upload rejects, the clear is skipped and the error propagates.
- **`omitNulls` (tested)** — Removes `null` values from a *whitelist* of keys in a plain object; leaves keys outside the list untouched.
- **Schema fixtures** — Tests import concrete schemas from `@api/schemas` (`UpdateUserByIdBody`, `CreateWebhookSubscriptionBody`, `CreateLocaleEntryBody`, `UpdateProductByIdBody`, `ReplaceProductByIdBody`) to drive real parse/validation assertions.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The critical semantic distinction the tests lock in: `''` becomes `null` (a *clear*) when the schema's field is nullable, but is simply *omitted* when the field has no null representation (e.g. a create-only optional string).
- Baseline diffing treats `''`, `undefined`, and `null` as the same "empty" sentinel, so a field that was already empty in the loaded record is not re-sent as a clear.
- `uploadThenClear` is atomic in its ordering: the clear request is a hard no-op if the upload throws. Tests use `vi.fn()` stubs to assert call order and argument splitting.
- The final `shapeBody` test round-trips the produced body through the schema's own `safeParse`, guarding against the util emitting a shape the API contract rejects.
