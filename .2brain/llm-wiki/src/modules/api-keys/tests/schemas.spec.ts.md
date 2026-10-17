---
source: src/modules/api-keys/tests/schemas.spec.ts
sha256: 971a1db4923af4d8f1e715b4864eab97e484d42331572ac154d34dca1f3c252a
generated_at: 2026-10-17T00:32:39.020361+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/schemas.spec.ts

## Purpose

Vitest suite that verifies the validation rules (not the user-facing messages) enforced by `apiKeyCreateSchema` on the API-key mint form. It pins down the allowed shape of `name`, `permissions`, and `expiresAt` so that contract changes are caught by tests rather than at runtime.

## Key elements

- **`validCredential`** – A module-level fixture with a passing `name`, a single `permissions` entry, and a one-day-future `expiresAt`. Serves as the baseline that every negative test mutates via spread.
- **`ahead(days)`** – Returns an ISO-8601 string `days` from now; used to exercise the expiry window boundary (360 vs 370 days).
- **`describe('apiKeyCreateSchema')`** – The sole test block. Each `it` isolates one rule:
  - minimal-valid acceptance
  - expiry required (omitted *and* empty-string both fail)
  - expiry upper bound (≤ 360 d accepted, > 360 d rejected)
  - name: empty rejected, > 200 chars rejected, exactly 200 accepted
  - permissions: empty array rejected, multiple entries accepted
  - past-dated expiry rejected

## Relationships

- **`src/modules/api-keys/schemas.ts`** – The only production import. This file exercises `apiKeyCreateSchema.safeParse()` and asserts on `.success`; it does not import or test any other export from that module.

## Notes

- The file header comment explicitly defers i18n message assertions to a sibling spec (`schemas-i18n.spec.ts`); only *rules* live here.
- All assertions use `safeParse(...).success` (boolean) rather than throwing `parse`, so tests never rely on exception matching.
- Boundary pairs (360/370 days, 200/201 chars) are intentional: each valid edge is tested alongside its invalid neighbor to prevent off-by-one regressions in `schemas.ts`.
