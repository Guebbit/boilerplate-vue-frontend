---
source: scripts/e2e/contract-mismatch.ts
sha256: 5168df73da642499b75c903e64d99a3eb17296a88dafaa30ba23b4ea6b94a0cf
signature: 669ee7bd18263dca1d382895a4e5e0045b46b21888ad53636ac82bc19a040ca8
generated_at: 2026-11-10T02:31:18.756825+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/contract-mismatch.ts

## Purpose

Pure predicate that determines whether a given `console` call is the application's contract-mismatch diagnostic — the specific error line the global Cypress hook turns into a failed test. Extracted as a dependency-free function so its decision logic can be pinned in a unit test without a browser or Cypress runtime.

## Key elements

- **`isContractMismatch(parameters: unknown[]): boolean`** (exported) — Reads only the first argument. Yields a positive match when it is a string that contains **both** the `[contract]` tag **and** the `CONTRACT_MISMATCH_TEXT` sentinel. Any other `console` output does not trigger a match.
- **`CONTRACT_MISMATCH_TEXT`** (imported) — The sentinel substring that uniquely identifies the contract-mismatch diagnostic among all other `[contract]`-prefixed messages.

## Relationships

- **`src/infrastructure/http/contract-mismatch-text.ts`** — Supplies the `CONTRACT_MISMATCH_TEXT` constant; that file is the single source of truth for the sentinel string used in both the app's HTTP layer (to emit the diagnostic) and this predicate (to recognize it).
- **`tests/support/e2e/commands.ts`** — The global Cypress hook that calls `isContractMismatch` on captured `console` arguments and fails the current test when it returns a positive match.
- **`tests/unit/scripts/e2e/contract-mismatch.spec.ts`** — Unit test that exercises `isContractMismatch` against the boundary cases (correct text, wrong `[contract]` note, non-string first arg, etc.) without any browser context.

## Notes

- The function is deliberately **pure** (no `window`, no Cypress globals) so it can be imported into a plain unit test. Do not add environment dependencies here.
- Both conditions (`[contract]` tag **and** the sentinel) are required; either alone is insufficient. This means other `[contract]` log lines in the codebase will never cause a test failure.
- Only `parameters[0]` is inspected; additional console arguments are irrelevant.
