---
source: tests/unit/scripts/contracts/shared-rules-render.spec.ts
sha256: 928c0188d86b9269b6d7cbc28d4585e37b6ed5ff9a444f52470be302ade00810
signature: e0c1618a48f97be3cdd4728ca0b6ea8af10d2bbc48d80a441bd605b1704b45dc
generated_at: 2026-11-10T08:13:10.903302+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/contracts/shared-rules-render.spec.ts

## Purpose

Unit tests for the pure rendering half of the shared-rules generator. Verifies that `deriveKey` produces stable identifiers and that `renderGenerated` emits correct TypeScript output (header, keyed-list objects, verbatim dumps) for both export shapes defined by `GenerateSpec`.

## Key elements

- **`spec`** (module-level const) — a minimal `GenerateSpec` with one `keyed-list` export (`names`) and one `verbatim` export (`limits`), used as the fixture for all `renderGenerated` tests.
- **`describe('deriveKey')`** — single assertion: dot-separated keys are uppercased and dots become underscores.
- **`describe('renderGenerated')`** — renders once into a shared `output` string, then asserts:
  - The do-not-edit header names the source file and the `npm run regenerate` command.
  - Keyed-list entries get per-key JSDoc docblocks (including multi-line descriptions) and are wrapped in `as const`.
  - Verbatim fields are emitted as parsed data with integer digit-grouping (`300_000`) and string quoting preserved.
  - A missing field throws an error naming the absent field.
  - Two input values that derive the same key (`a.b` vs `a_b`) are rejected.

## Relationships

- **`scripts/contracts/shared-rules/render.ts`** — the module under test; provides `deriveKey` and `renderGenerated`.
- **`scripts/contracts/shared-rules/generate-spec.ts`** — source of the `GenerateSpec` type used to type the fixture.

## Notes

- `output` is computed once at the `describe` level and shared across all `renderGenerated` assertions; mutation-style error tests call `renderGenerated` fresh and assert via `.toThrow`.
- The duplicate-key test uses `limits: {}` as a no-op placeholder to satisfy the `verbatim` export requirement in the spec.
