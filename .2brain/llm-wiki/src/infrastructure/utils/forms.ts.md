---
source: src/infrastructure/utils/forms.ts
sha256: 1eb82d6e86bd2a16c74630bc0d93f4bff5896eec513aeeb01ee64ccdb6c8ecd9
generated_at: 2026-10-02T12:04:42.263302+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/forms.ts

## Purpose

The single form-to-wire translation boundary. It converts raw form state (where `''`, `null`, and `undefined` are all "empty") into the correct wire spelling dictated by the generated Zod request-body schema, diffing against a loaded record to omit unchanged fields on PATCH. All other code treats form values opaquely; this file is where `''` becomes `''`, `null`, or an omitted key depending on what the schema accepts.

## Key elements

- **`BodySchemaName`** — Union type of all `*Body`-suffixed export names in `@api/schemas`.
- **`shapeBody(schema, form, baseline?)`** — Synchronous core: diffs form against baseline, recurses into nested objects, and spells empties via `safeParse`. Returns a plain `Record<string, unknown>`.
- **`toRequestBody(name, form, baseline?)`** — Async, typed wrapper. Dynamically imports `@api/schemas` (keeping the ~350 KB chunk out of the entry bundle) and returns `Promise<z.input<BodySchemas[TName]>>`.
- **`spellEmpty(field, raw)`** — Internal. Probes the field schema with `safeParse('')` / `safeParse(null)` to decide whether empty is `''`, `null`, or omitted. Never throws.
- **`shapeObject` / `shapeField`** — Internal recursion helpers. `shapeObject` filters unchanged keys then maps through `shapeField`; `shapeField` delegates empties to `spellEmpty` and recurses into plain objects.
- **`uploadThenClear<T, TResult>(body, sendUpload, sendClears)`** — Splits a body into non-null entries (multipart upload) and null entries (JSON PATCH), sending the PATCH only if clears exist. Non-atomic; caller handles the rejection.
- **`WithoutClears<T>` / `OnlyClears<T>`** — Mapped types that partition a body into its upload-able and clear-only portions for the multipart split.
- **`omitNulls(patch, keys)`** — Filters a subset of keys to non-null values only; used to keep optimistic local cache shapes from absorbing wire-level `null` clears.

## Relationships

No graph neighbors are listed for this file. It imports `lodash-es` (`isEqual`, `isPlainObject`) and type-only `zod`, and dynamically imports `@api/schemas`.

## Notes

- **Byte-budget discipline.** Both `zod` and `@api/schemas` are referenced as *types only* (or via dynamic `import()`). A value import of either would pull a large chunk into every entry bundle. The code deliberately reads `field.type` / `field.unwrap()` rather than using `instanceof ZodOptional` for this reason.
- **`unchanged` treats all empties as equal.** An untouched `''` in the form against a record that never had the field is considered unchanged and omitted, even though the raw values differ.
- **`uploadThenClear` is not atomic.** If the JSON PATCH (clears) fails after the upload succeeds, the caller sees the rejection and the form stays dirty. This is intentional and only used when the schema requires the split.
- **`shapeBody` validates nothing.** It never throws. Schema validation is the responsibility of `validateRequestAgainstContract` (referenced in the module docstring but not defined here).
- **`spellEmpty` relies on `safeParse`.** This is the only runtime interaction with a Zod schema instance; it never throws, only returns `{ success }`.
