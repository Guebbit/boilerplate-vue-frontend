---
source: src/modules/example/tests/schemas.spec.ts
sha256: 9bd1c90580958f1f383ccac1ffead1081c70d4ea4f56cbb41a23308354e94d4a
generated_at: 2026-10-17T00:53:57.717920+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/schemas.spec.ts

## Purpose

Vitest spec that verifies the refusal boundaries of the example form schemas (`exampleCreateSchema`, `exampleEditSchema`). It confirms that inputs violating the generated API contract (empty strings, lengths past the ceiling, unknown or missing status values) are rejected, and that inputs sitting exactly on the contract's limits are accepted. The bounds are asserted against constants imported from the generated contract rather than hardcoded numbers, so the test tracks the contract if it changes.

## Key elements

- **`VALID`** – local constant (`{ title, body }`) used as the baseline "good" input for every case.
- **`describe('exampleCreateSchema', …)`** – asserts acceptance of valid input, rejection of empty `title`/`body` (via `it.each`), and the exact max-length boundary for both fields using `createExampleBodyTitleMax` / `createExampleBodyBodyMax`.
- **`describe('exampleEditSchema', …)`** – asserts that each member of the closed status set (`draft`, `published`, `archived`) is accepted, that an out-of-set status (`deleted`) is refused, and that omitting `status` entirely is refused (edit requires a whole-state name).

## Relationships

- **`src/modules/example/schemas.ts`** – imports `exampleCreateSchema` and `exampleEditSchema`; these are the Zod schemas under test.
- **`@api/schemas`** (generated) – imports `createExampleBodyTitleMax` and `createExampleBodyBodyMax`, the numeric ceilings the schemas enforce. The test uses these values to construct boundary strings, so the spec stays in sync with the contract automatically.

## Notes

- The module doc comment explicitly frames the file as testing *refusal*, not enumeration of valid shapes; the "accept" cases exist only to prove the boundary is inclusive.
- Length tests use `'x'.repeat(n)` to build exact-length strings; they assume the schema measures string length (character count), not byte length.
- The status set is intentionally closed and small; adding a new status to the contract will cause the "refuses a status outside the closed set" test to keep passing but the `it.each` list here will go stale until updated.
- All assertions use `safeParse().success` rather than expecting a thrown error, consistent with the schemas' non-throwing API.
