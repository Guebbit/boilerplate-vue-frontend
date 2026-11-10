---
source: tests/unit/scripts/e2e/declared-statuses.spec.ts
sha256: 25ea0f63a4527dbd9d37ee7cebd72040efb3c4b2e5cc013d9015abb21d420586
signature: 25ea0f63a4527dbd9d37ee7cebd72040efb3c4b2e5cc013d9015abb21d420586
generated_at: 2026-11-10T08:15:52.629011+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/declared-statuses.spec.ts

## Purpose

Vitest unit test for the `declaredStatuses` helper, verifying that it correctly extracts the numeric HTTP status codes declared for a given method and path in an OpenAPI (YAML) spec, and that it safely returns an empty array when the operation or path is absent.

## Key elements

- **`SPEC`** – Inline YAML string acting as the test fixture: a minimal OpenAPI document with a single `POST /orders/{id}/cancel` operation declaring `200`, `404`, `409`, and `default` responses.
- **`describe('declaredStatuses')`** – Test suite containing two cases:
  - *Ascending numeric list* – asserts `declaredStatuses` returns `[200, 404, 409]` (numeric, sorted, `default` excluded).
  - *Empty for unknown operation/path* – asserts `[]` when the method (`GET`) or path (`/nope`) is not present in the spec.

## Relationships

- **`scripts/e2e/declared-statuses.ts`** – The module under test. This spec imports its single export `declaredStatuses(spec, method, path)` and exercises its return value directly.

## Notes

- The `default` response key in the spec is intentionally present to confirm it is **not** included in the returned array (only numeric keys are).
- Status codes are expected to be returned **sorted ascending** as numbers, not strings.
- The spec is defined as a local constant rather than a fixture file, keeping the test self-contained and trivially readable.
