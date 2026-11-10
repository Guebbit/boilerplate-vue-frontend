---
source: tests/unit/scripts/audit/capture-scope.spec.ts
sha256: 9ff8a8c5a76b40ac5d169212865b63c852c3af801c4532d9dc76b4ba38e76d4e
signature: 9dfe8b8bb33a57e366059ea2fe524017ecd2d16111abe0ec0517ca49416c2af7
generated_at: 2026-11-10T08:11:35.908703+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/capture-scope.spec.ts

## Purpose

Unit tests for `scopeToSpecs`, verifying that a typed scope (empty string, module name, file path, `shell`, or `--diff`) resolves to the correct set of Cypress spec file paths, and that invalid inputs raise a `RangeError`.

## Key elements

- **`describe('scopeToSpecs', …)`** — single suite covering every public behavior of `scopeToSpecs`.
- **`modules`** — shared fixture array `['cart', 'orders']` used across all cases.
- **`none`** / **`onlyCartActions`** — stub `exists` predicates; the latter simulates a world where only `cart` has an `actions.cy.ts` file.
- **Test cases** (one per `it`):
  - Empty scope → shell + every module's `a11y.cy.ts`.
  - Named module / `shell` → single spec path.
  - File-path scope → resolves to the owning module via path inspection.
  - `exists` predicate → conditionally includes `actions.cy.ts`.
  - `--diff` with `changedFiles` → scopes to touched modules; `widened: false`.
  - `--diff` touching shared chrome (`src/ui/vuetify/…`) → `widened: true`, full spec set.
  - `--diff` with no module match, or an unknown scope name → throws `RangeError`.

## Relationships

- **imports** `scopeToSpecs` from `scripts/audit/design-manual/scripts/capture-scope.ts` — the sole production module under test. All assertions validate that module's public contract.

## Notes

- The `exists` callback is injected as a pure function rather than mocked via `fs`, keeping tests synchronous and I/O-free.
- `widened` is only asserted when it is `true`; when `false` the full object shape (`{ specs, widened: false }`) is checked explicitly to guard against accidental omission.
- The `RangeError` cases use `expect(() → …).toThrow(RangeError)` — the test suite relies on the function *throwing*, not returning an empty array, for ambiguous inputs.
