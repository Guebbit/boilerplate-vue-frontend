---
source: tests/unit/scripts/e2e/problem-stub.spec.ts
sha256: 3fc8e1742eb452a3a88f6428a2f61550dea7d641b1eab22426de95aacd612a33
signature: 3fc8e1742eb452a3a88f6428a2f61550dea7d641b1eab22426de95aacd612a33
generated_at: 2026-11-10T08:17:22.262032+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/problem-stub.spec.ts

## Purpose

Unit test (Vitest) that pins the contract of the `rejectEnvelope` stub builder used in Cypress e2e flows: the returned body must satisfy the generated `Problem` type, the response must carry the RFC 7807 media type, and the body shape must match the expected envelope exactly.

## Key elements

- **`describe('rejectEnvelope')`** — single test block covering the stub's output contract.
- **Type-assignment check (`const body: Problem = response.body`)** — leverages TypeScript's structural typing so any deviation in the generated `Problem` interface fails compilation rather than requiring a runtime assertion.
- **Runtime assertions** — verifies `statusCode === 422`, `content-type` equals `PROBLEM_MEDIA_TYPE`, and the full body object (including the nested `errors` array) matches the expected literal.

## Relationships

- **`tests/support/problem-stub.ts`** — the module under test. This spec imports `PROBLEM_MEDIA_TYPE` (the `application/problem+json` constant) and the `rejectEnvelope` factory function from it. The stub is the single source of truth for how e2e tests simulate error responses.

## Notes

- The doc comment references "the Cypress stub builder," but the test itself runs under **Vitest**. The stub is *consumed* by Cypress e2e tests; this spec merely unit-tests the builder in isolation.
- The type-assignment line is intentional: it is a compile-time guard, not a redundant runtime check. Removing it silently loses contract verification.
- The test is intentionally narrow (one status code, one error shape). Adding new status-code variants here is the expected extension point if the stub gains them.
