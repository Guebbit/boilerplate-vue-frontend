---
source: tests/unit/scripts/audit/unused-locale-keys.spec.ts
sha256: 6263c64fe3efab7240b58329239854fbcf28adf66aa46b44b69ee62de5db5132
signature: 6263c64fe3efab7240b58329239854fbcf28adf66aa46b44b69ee62de5db5132
generated_at: 2026-11-10T08:12:49.382335+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/unused-locale-keys.spec.ts

## Purpose

Unit tests for the three core helpers in the unused-locale-keys audit script. Verifies that leaf-path extraction, dynamic-prefix detection, and the final "unused" diff all behave correctly against small inline fixtures, so the audit script can be trusted before it runs against real locale files.

## Key elements

- **`describe('leafPathsOf')`** — asserts that nested object keys are joined with dots (`a.b`, `a.c`) and that an array value counts as a single leaf rather than being expanded.
- **`describe('dynamicPrefixesOf')`** — asserts that both template-literal prefixes (`` t(`generic.${code}`) ``) and quoted string prefixes passed to a helper (`'order-timeline.by-'`) are extracted and returned.
- **`describe('unusedPaths')`** — asserts the end-to-end diff: a key named literally in source is kept, a key under a dynamic prefix is kept, and a key with no reference is returned as unused.

## Relationships

- **`scripts/audit/unused-locale-keys/scan.ts`** — sole import target; provides the three functions under test (`dynamicPrefixesOf`, `leafPathsOf`, `unusedPaths`). This spec is the only known consumer in the test tree.

## Notes

- Tests operate on inline string literals as the "source haystack" rather than reading project files, so they isolate parsing/diffing logic from I/O.
- The `unusedPaths` signature is `(dictionary, haystack, dynamicPrefixes[])` — the third argument is a pre-extracted prefix list, not raw source; callers (the audit CLI) are expected to run `dynamicPrefixesOf` first.
- Arrays in the dictionary are opaque leaves; the audit will never flag individual array indices as unused.
