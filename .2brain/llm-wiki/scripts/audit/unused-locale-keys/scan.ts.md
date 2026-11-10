---
source: scripts/audit/unused-locale-keys/scan.ts
sha256: 622bb5861b98c886d0f2a617f36b2b5654968461dccf401567855f34bf11cffc
signature: 31cd0a4f9c56c2f578d9a70ff0e4756cd4e10144cb87aa07b92128b63dcf19b8
generated_at: 2026-11-10T02:23:55.744491+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/unused-locale-keys/scan.ts

## Purpose

Scans the repository for locale dictionary keys that no source file ever reads, flagging them as dead leftovers or misplaced entries. Because locale JSON has no compiler, only a source-text scan can detect these. The module is strictly report-only — it never blocks a build.

## Key elements

- **`Dictionary`** (interface) — shape of a parsed locale file: nested objects whose leaves are strings, readonly arrays, or further `Dictionary` nodes.
- **`leafPathsOf(dictionary, prefix?)`** — recursively collects every dot-separated leaf path in a dictionary. An array value counts as a single leaf (consumed whole by `tm()`/`rt()`), not per-element.
- **`dynamicPrefixesOf(sourceText)`** — extracts key prefixes that the source builds at runtime: template-literal prefixes (`` `x.y.${…}` ``) and quoted strings ending in `.` or `-` (helpers that append a code).
- **`unusedPaths(dictionary, haystack, prefixes)`** — returns leaf paths absent from the haystack and not under any dynamic prefix.
- **`scanLocaleKeys()`** — main entry point. Globs `src/**/*.vue` and `src/**/*.ts` for source text, globs `src/locales/*.json` and `src/modules/*/locales/*.json` for dictionaries, builds a combined haystack (source + all dictionary JSON), and returns `{ unused: string[]; files: number }` where each unused entry is formatted `file: dot.path`.
- **`readDictionary(file)`** (private) — `JSON.parse` a locale file into a `Dictionary`.

## Relationships

- **`scripts/audit/unused-locale-keys/report.ts`** — consumes the result of `scanLocaleKeys()` and formats it for terminal output. `scan.ts` provides data; `report.ts` owns presentation.
- **`tests/unit/scripts/audit/unused-locale-keys.spec.ts`** — unit-tests the exported functions (`leafPathsOf`, `dynamicPrefixesOf`, `unusedPaths`, `scanLocaleKeys`).

## Notes

- The haystack for "is this key read?" includes **all dictionary strings stringified**, not just source code. This catches linked messages (`@:a.b.c`) where one dictionary entry references another.
- Dynamic-prefix exemption is intentionally permissive: any leaf that starts with a detected prefix is skipped, even if that specific sub-key is truly unused. The trade-off avoids false positives for runtime-built keys.
- All file I/O is synchronous (`globSync`, `readFileSync`); the module is designed for a one-shot CLI invocation, not a long-running server.
- Arrays in a dictionary are treated as atomic leaves. Do not expect per-element path detection (e.g., `a.b.0` will never appear as a leaf).
