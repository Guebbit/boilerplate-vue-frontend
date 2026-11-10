---
source: src/modules/example/tests/schemas.spec.ts
sha256: 978a6def832526209eb56a7925c97c02badfb599111d2ce27194e69d6a9bd3aa
signature: c39fad55951196bb9a90173e68195b1437b3ea6e3f338d7a4191716fa8b96017
generated_at: 2026-11-10T04:27:29.482465+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/schemas.spec.ts

## Purpose

Vitest suite for `exampleFormSchema` (the Zod schema governing the create/edit form). It verifies what the form accepts and rejects, sourcing length ceilings from the generated API contract rather than restating them, so the tests stay in sync automatically when the contract changes.

## Key elements

- **`VALID`** — a minimal valid submission `{ title, body }` used as the baseline in every assertion.
- **`describe('exampleFormSchema')`** — the single top-level suite containing five `it` blocks:
  - *ignores a status* — confirms `status` is stripped from the output (it is not a form field).
  - *accepts a title and a body* — happy-path check.
  - *refuses an empty %s* (parameterized via `it.each`) — empty-string `title` or `body` must fail.
  - *title at ceiling / over ceiling* — boundary test using `createExampleBodyTitleMax` from `@api/schemas`.
  - *body at ceiling / over ceiling* — boundary test using `createExampleBodyBodyMax` from `@api/schemas`.

## Relationships

- **`src/modules/example/schemas.ts`** — provides `exampleFormSchema`, the object under test. Every assertion calls `.parse` or `.safeParse` on this schema.
- **`@api/schemas`** (generated contract) — supplies the two numeric ceilings (`createExampleBodyTitleMax`, `createExampleBodyBodyMax`) used to construct boundary-case inputs. The test does not hard-code lengths; it reads them from the same source the schema uses.

## Notes

- The schema is expected to **strip** `status` from parsed output (the first test asserts equality with `VALID`, which has no `status`). If the schema ever starts passing `status` through, that test catches the regression.
- Ceiling tests use `=== max` (accepted) and `=== max + 1` (rejected) to pin exact boundary behavior; off-by-one changes in the schema or contract will fail here.
- `it.each` is used only for the two symmetric empty-field cases; boundary cases are written as separate `it` blocks so a failure points directly at the field.
