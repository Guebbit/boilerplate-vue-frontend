---
source: tests/unit/ui/field-error.spec.ts
sha256: e0ce69cde3602bb10de773ac176fc6bde758fc3e5d94fb49d9c9259700760a33
signature: e0ce69cde3602bb10de773ac176fc6bde758fc3e5d94fb49d9c9259700760a33
generated_at: 2026-11-10T08:25:11.421353+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/field-error.spec.ts

## Purpose

Unit tests for the `fieldErrorProps` binding helper, verifying that a Vuetify field's `error-messages` and `aria-invalid` attributes stay in lockstep with the current message list. The `aria-invalid` contract is critical because screen readers announce it and the toolkit's `revealErrors()` uses it as a focus target.

## Key elements

- **`describe('fieldErrorProps')`** — the sole test block. Two `it` cases cover the two states:
  - *Invalid state* — passing `['Required']` or a bare string `'Required'` must yield `aria-invalid: 'true'` and the messages forwarded.
  - *Valid / empty state* — passing `[]` or `undefined` must yield `aria-invalid: undefined` and `error-messages: []`.

## Relationships

- No graph neighbors.

## Notes

- `aria-invalid` is expected to be the **string** `'true'`, not a boolean, and to be **absent** (`undefined`) rather than `'false'`. Any refactor that flips this to a boolean or emits `'false'` will break screen-reader announcements and `revealErrors()` focus logic.
- The function accepts both an array and a single string; the spec asserts both forms produce the same `aria-invalid` result, but only the array form is checked for the full object shape.
- The `undefined` input case asserts the full return object equals `{ 'error-messages': [], 'aria-invalid': undefined }`, locking in the normalization behavior.
