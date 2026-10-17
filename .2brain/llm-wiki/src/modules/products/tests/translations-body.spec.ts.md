---
source: src/modules/products/tests/translations-body.spec.ts
sha256: c66507e0036ad7ecae9bbbc0c54e7854ee4baa4bdc43092702823c6abf51ec15
generated_at: 2026-10-17T01:34:50.397547+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/translations-body.spec.ts

## Purpose
Vitest spec for the two form→wire mappers (`toCreateTranslations`, `toPatchTranslations`) that serialize a product's locale map into the shape the API expects. The central concern is the RFC 7396 (JSON Merge Patch) rule that a *blank* field must be **omitted** on create but sent as **`null`** on PATCH — the only valid "clear this field" signal.

## Key elements
- **`describe('toCreateTranslations', …)`** — three cases:
  - Blank/whitespace `description` → key is **removed** from the object (nothing to clear on a new resource).
  - Non-blank `description` → key is **preserved** as-is.
  - A locale set to `null` → the entire locale entry is **dropped** (a non-existent locale has nothing to delete).
- **`describe('toPatchTranslations', …)`** — three cases:
  - Blank `description` → key is **replaced with `null`** (the RFC 7396 clear signal).
  - Non-blank `description` → key is **preserved**.
  - A locale set to `null` → the locale key is **kept as `null`** in the output (the PATCH delete signal for the whole locale).

## Relationships
- **`src/modules/products/composables/translations-body.ts`** — sole import target. The spec exercises `toCreateTranslations` and `toPatchTranslations` directly; no other modules are referenced.

## Notes
- Whitespace-only strings (`'   '`) are treated the same as `''` in the create path (both result in key removal). The test for this uses the `it`-locale case.
- The PATCH path deliberately emits `description: null` even when the source object had `description: ''` — this is not a bug; it is the RFC 7396 contract.
- The `it`-locale case in the PATCH suite (`toEqual({ en: {…}, it: null })`) confirms that `null` at the *locale* level is a pass-through, not a key to strip.
