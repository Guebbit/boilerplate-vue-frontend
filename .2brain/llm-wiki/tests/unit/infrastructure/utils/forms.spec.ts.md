---
source: tests/unit/infrastructure/utils/forms.spec.ts
sha256: 8dedd437d9557ccd8d4e15a1b1c7218179015a605cbc8a72632a99b57b955ac0
generated_at: 2026-10-17T02:39:14.476602+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/forms.spec.ts

## Purpose

Unit tests for the four form-body utilities in `@/infrastructure/utils/forms.ts`. The suite locks down the contract that form values (`''`, `undefined`, `null`) are normalized against a Zod schema before being sent to the API, ensuring that "cleared" fields, unchanged fields, and nested diffs all produce a body the target schema accepts.

## Key elements

- **`describe('shapeBody', …)`** — The bulk of the file. Verifies that `shapeBody(schema, body, baseline?)`:
  - Rewrites `''` → `null` only when the schema marks the field nullable (e.g. `phone`, `locale`).
  - Omits the key entirely when the schema has no nullable interpretation (create-only fields).
  - Preserves `''` when the schema explicitly accepts it (e.g. `value` on `CreateLocaleEntryBody`).
  - Drops keys whose value equals the baseline (PATCH diff), including deep array comparison.
  - Handles nested objects by diffing each child against its own baseline.
  - Passes through keys the schema does not define (e.g. a raw `Blob`).
  - Always produces a body that `schema.safeParse` accepts.
- **`describe('toRequestBody', …)`** — Single test confirming the async wrapper loads a schema by string name (`'UpdateUserByIdBody'`) and delegates to `shapeBody`.
- **`describe('uploadThenClear', …)`** — Verifies the two-request flow: non-null fields go in the multipart upload, null fields are stripped out and sent as a separate "clear" request. Confirms the clear request is skipped (and the upload error rethrown) when the upload rejects.
- **`describe('omitNulls', …)`** — Three tests confirming the helper removes `null` values only for keys in the supplied list, leaving other keys untouched.

## Relationships

No graph neighbors are recorded for this file. It imports the four functions under test from `@/infrastructure/utils/forms.ts` and pulls concrete Zod schemas from `@api/schemas` as test fixtures.

## Notes

- The tests intentionally reference **real** production schemas (`UpdateUserByIdBody`, `CreateProductBody`, `CreateLocaleEntryBody`, etc.) rather than inline stubs, so schema changes surface here as test failures.
- The "locale refuses `''` by pattern, not minLength" comment flags a specific schema quirk: `locale` is nullable and pattern-guarded, so the `''`-to-`null` rewrite is driven by the nullable flag, not by a `minLength` check.
- `uploadThenClear` tests rely on `vi.fn()` mocks for the two callback arguments; there is no real HTTP interaction in this file.
- The file uses Vitest (`describe`/`it`/`expect`/`vi`), not Jest.
