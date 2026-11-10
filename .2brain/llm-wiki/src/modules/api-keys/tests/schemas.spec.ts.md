---
source: src/modules/api-keys/tests/schemas.spec.ts
sha256: e4f59a872abb12cfd1d008a35207f8c87a040a812defb51adada9b57931115e7
signature: f52875347295f90184e4051986fcd76a84298ea2fb3af76e50fa8730fd9e8764
generated_at: 2026-11-10T03:51:39.248670+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/schemas.spec.ts

## Purpose

Vitest suite that pins down the **structural validation rules** of `apiKeyCreateSchema` (name, permissions, expiry) for the API-key mint form. It deliberately does **not** assert on error-message text—that concern is delegated to `schemas-i18n.spec.ts`.

## Key elements

- **`validCredential`** – A constant object representing a minimal valid payload (name, single permission, expiry ~24 h out). Every test mutates exactly one field off this baseline.
- **`describe('apiKeyCreateSchema', …)`** – Eight `it` blocks covering:
  - happy path (minimal valid credential passes)
  - `expiresAt` is required and must be non-empty
  - `name` must be non-empty and ≤ 200 chars (boundary tested at 200 and 201)
  - `permissions` must be a non-empty array (multiple entries accepted)
  - `expiresAt` must be in the future (past date rejected)

## Relationships

- **`src/modules/api-keys/schemas.ts`** – The sole import (`apiKeyCreateSchema`). This spec exercises that schema's `.safeParse()` output (the `.success` boolean) and is the only consumer of the schema in the test tree.

## Notes

- Tests assert on `safeParse(…).success` (a boolean), not on the shape or text of `.error`. If you change an error message, update `schemas-i18n.spec.ts`, not this file.
- The expiry in `validCredential` is computed relative to `Date.now()` at module-load time, so the suite is time-sensitive only in the sense that the "past expiry" test uses `now − 60 s`.
- Name-length boundary is hard-coded (200 / 201). If the schema's max changes, both the boundary tests and the `x.repeat(…)` literals must be updated in lock-step.
