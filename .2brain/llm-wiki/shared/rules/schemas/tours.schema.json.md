---
source: shared/rules/schemas/tours.schema.json
sha256: 69a5717f9f7fe998228fdca6276c4fb8cb3edcf2a3114ccfced510dda86f180f
signature: a2484d632023cbd916fb9949fa4dfcf431ea86c614d9a6f8214fb70ee0d3b570
generated_at: 2026-11-10T02:48:29.577292+00:00
model: ollama:qwen3.8:27b
---

# shared/rules/schemas/tours.schema.json

## Purpose

A JSON Schema (draft 2020-12) that defines the validation contract for a tours configuration object. It constrains the shape, naming, and per-tour settings so that any producer or consumer of a "tours" payload can be checked against a single canonical definition.

## Key elements

- **Top-level object** — requires a single `tours` property; no other keys are permitted.
- **`tours` (object)** — a map of tour identifiers to tour configs. Keys must match `^[a-z][\da-z-]*$` (lowercase alphanumerics and hyphens, starting with a letter).
- **Each tour entry (object)** — allows exactly two fields and nothing else:
  - `version` (integer, required) — must be > 0 and ≤ 9007199254740991.
  - `auto` (boolean, optional) — flag controlling automatic behavior.
- **`additionalProperties: false`** — enforced at both the top level and every tour entry, so unknown fields cause a validation error.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `propertyNames` pattern means tour keys are lowercase-only; mixed-case or keys starting with a digit/hyphen will fail validation.
- `version` is the sole required field per tour; `auto` is purely optional.
- Because `additionalProperties` is `false` at every level, adding a new field to a tour entry requires updating this schema first.
- The max value for `version` (9007199254740991) is the same as JavaScript's `Number.MAX_SAFE_INTEGER`, signaling the schema targets JS/TS consumers.
