---
source: src/modules/products/tests/translations-body.spec.ts
sha256: 0ed73a13a6cd226048fe079405d38a23adef52442d0f19aee17b460aa5735d36
signature: 54ad8d16f15cc0d3bc21368bd9116dd4e504d85eed232bcfb1d61c1c58c5751d
generated_at: 2026-11-10T05:32:21.846752+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/translations-body.spec.ts

## Purpose

Vitest suite that pins the form→wire contract for product translations. Its single concern is the asymmetry the API requires between CREATE and PATCH: a blank `description` must be **omitted** on create but emitted as **`null`** on patch (RFC 7396 merge-patch semantics), and a `null` locale must be **dropped** on create but **retained** as a delete signal on patch.

## Key elements

- **`describe('toCreateTranslations')`** — three cases verifying that blank/whitespace-only descriptions are stripped, real descriptions are kept, and a `null` locale entry is removed from the output object.
- **`describe('toPatchTranslations')`** — three cases verifying that a blank description is converted to `description: null`, a real description passes through, and a `null` locale is preserved as-is (the API's "delete this locale" signal).

## Relationships

- **`src/modules/products/translations-body.ts`** — the sole import target; this spec exercises its two exports (`toCreateTranslations`, `toPatchTranslations`) and asserts the exact shape of their return values.

## Notes

- The PATCH test for a locale that has **no** `description` key at all (`{ en: { title: 'Cozy Bed' }`) still expects `description: null` in the output. In other words, on PATCH the function normalises *absence* of a description to an explicit `null`, whereas on CREATE it simply leaves the key out. Any refactor of `translations-body.ts` must preserve that distinction.
- Whitespace-only strings (e.g. `'   '`) are treated as blank in the CREATE path; the spec does not separately test that case for PATCH, but the shared "blank" heuristic presumably applies to both.
