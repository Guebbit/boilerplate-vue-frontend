---
source: src/infrastructure/utils/forms.ts
sha256: 1eb82d6e86bd2a16c74630bc0d93f4bff5896eec513aeeb01ee64ccdb6c8ecd9
signature: 538894ff54f22217e1dabe1af95de9fbd048aa1776316ec5d0d22ece273e4c2d
generated_at: 2026-11-10T03:12:03.605084+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/forms.ts

## Purpose

The form-to-wire boundary. A text input produces `''` for "empty," but the wire (RFC 7396) uses `null` to clear a field and omission to leave it alone. This module translates once: the loaded record (baseline) decides *which* fields changed, and the generated Zod schema decides *how* empty is spelled for each field. It is the single place form state becomes a request body.

## Key elements

- **`shapeBody(schema, form, baseline?)`** — Core export. Diffs form values against an optional baseline record, then spells each surviving empty value according to the schema (`''`, `null`, or omitted). Validates nothing.
- **`toRequestBody<TName>(name, form, baseline?)`** — Async wrapper that dynamically imports `@api/schemas` (keeping the ~350 KB contract chunk out of entry bundles) and returns a body typed as `z.input<BodySchemas[TName]>`. Every submit handler already awaits it.
- **`uploadThenClear<T>(body, sendUpload, sendClears)`** — Splits a body into non-null entries (multipart upload) and `null` entries (follow-up JSON PATCH). The second request fires only when clears are present; not atomic by design.
- **`omitNulls(patch, keys)`** — Filters specified keys to their non-null values, for merging into a local cache whose shape never holds `null`.
- **`WithoutClears<T>` / `OnlyClears<T>`** — Mapped types that split a body into its "send as-is" and "clear" halves for compiler-checked multipart calls.
- **`spellEmpty(field, raw)`** *(internal)* — Probes the field schema with `safeParse` to decide whether `''` is legal, `null` clears, or the key must be omitted.
- **`shapeField` / `shapeObject` / `unchanged`** *(internal)* — Recursive shaping and baseline-diff helpers; `unchanged` treats `undefined`, `null`, and `''` as a single "empty" for comparison.

## Relationships

- **`tests/cross-cutting/module-map.spec.ts`** — Asserts this module's existence and export surface as part of the project-wide module inventory.
- **`scripts/lighthouse/evaluate.ts`** — Consumes `toRequestBody` / `shapeBody` when constructing API calls for automated Lighthouse evaluation runs.

## Notes

- **No value import of Zod or `@api/schemas`.** Both are accessed via type-only or dynamic `import()` to stay within the entry-bundle byte budget. `unwrapField` uses the public `.type` discriminator and `.unwrap()` instead of `instanceof` for the same reason.
- **`toRequestBody` is inherently async.** Callers must `await` it; there is no sync path because the schema chunk must not be statically bundled.
- **`uploadThenClear` is not atomic.** If the follow-up PATCH fails, the caller sees a rejection and the form remains dirty—nothing is silently lost, but the upload already committed.
- **`shapeBody` validates nothing.** It never throws and does not check required fields. A separate `validateRequestAgainstContract` (referenced in the module doc) is responsible for rejecting malformed bodies at call sites.
- **`unchanged` collapses all three empty shapes.** An untouched `''` in the form against a record that never had the key reads as "unchanged" and is omitted from the body.
