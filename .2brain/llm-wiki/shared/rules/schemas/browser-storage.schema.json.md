---
source: shared/rules/schemas/browser-storage.schema.json
sha256: b63f9c55c08f90de66a640bdcbbf4d75153d80e1ef8221353974b0d5facf33ec
signature: 8c97d8bc4fb2dc4bfde97a658b62348347a35f269fe9449f15797881da8f011c
generated_at: 2026-11-10T02:48:08.878500+00:00
model: ollama:qwen3.8:27b
---

# shared/rules/schemas/browser-storage.schema.json

## Purpose

JSON Schema (draft 2020-12) that validates a declarative browser-storage configuration object. It enforces the shape, naming conventions, and allowed enum values so that any file describing which cookies/storage entries the project uses can be machine-checked before it is consumed by tooling.

## Key elements

- **`order`** — Required array (min 1 item) of identifier strings (`^[a-z][\dA-Za-z]*$`). Declares the display/priority order of storage entries.
- **`items`** — Required object whose **keys** must also match the same identifier pattern. Each value is a storage-entry descriptor.
- **Storage-entry descriptor** (the `additionalProperties` type inside `items`):
  - `name` *(required)* — Human-readable label, non-empty string.
  - `setter` *(required)* — Who writes the entry: `"frontend"` or `"library"`.
  - `kind` *(required)* — Browser storage mechanism: `"cookie"`, `"localStorage"`, or `"sessionStorage"`.
  - `necessity` *(required)* — Consent classification: `"necessary"` or `"consent"`.
  - `when` *(optional)* — Context in which the entry is relevant: `"analytics"` or `"faro"`.
- **`additionalProperties: false`** at both the root and each entry — no undeclared fields are permitted.

## Relationships

No graph neighbors are recorded for this file. It is a leaf schema document consumed by validators or tooling outside this dependency graph.

## Notes

- `when` is the only non-required property on an entry; omit it when the entry applies to all contexts.
- The identifier pattern (`^[a-z][\dA-Za-z]*$`) allows digits and uppercase after the first character (e.g. `sessionStorage` is valid as a key), but rejects leading underscores, hyphens, or uppercase.
- The schema does **not** enforce that every key in `items` appears in `order` (or vice versa); that cross-reference is the responsibility of a consuming validator or lint rule.
