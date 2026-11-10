---
source: tests/unit/scripts/e2e/contract-mismatch.spec.ts
sha256: d7e2f56e275a9eb91670165b8b0fb042e1f4028477a5da16c0aa80b54750dab9
signature: d7e2f56e275a9eb91670165b8b0fb042e1f4028477a5da16c0aa80b54750dab9
generated_at: 2026-11-10T08:15:13.336576+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/contract-mismatch.spec.ts

## Purpose

Vitest unit tests for the `isContractMismatch` predicate, which classifies `console.error` messages to distinguish genuine OpenAPI contract failures (logged by `validate.ts`) from unrelated noise. The tests exist to guard against both false positives (failing innocent tests) and false negatives (silently letting schema drift through).

## Key elements

- **`DIAGNOSTIC` (const)** — A canned string matching the exact format `validate.ts` emits, including the `[contract]` prefix, HTTP method/path, and a field-level detail line. Used as the canonical true-positive input.
- **`describe('isContractMismatch')`** — Four `it` blocks covering:
  - True positive: the diagnostic string is classified as a mismatch.
  - False-positive guard: an unrelated `TypeError` message is not.
  - False-positive guard: a `[contract]` line that *skips* validation (not a mismatch) is not.
  - Defensive: non-string first arg (`Error` instance) and empty array both return `false`.

## Relationships

- **`scripts/e2e/contract-mismatch.ts`** — Sole import. Provides the `isContractMismatch` function under test; this spec is its only unit-test coverage.

## Notes

- The tests treat the first argument of the `console.error` call as the sole discriminator; any non-string value (including `Error` instances) must yield `false`.
- The `[contract]` tag alone is insufficient — the predicate must also require a "does not match" phrase. The third test case pins this down explicitly.
- No network, DOM, or Cypress fixtures are involved; this is a pure string-classification test despite living under a `scripts/e2e` path.
