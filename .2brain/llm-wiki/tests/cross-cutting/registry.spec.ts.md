---
source: tests/cross-cutting/registry.spec.ts
sha256: 122e8b7e7e0e900963b47b3d8df27dcfcda0b4f7c0c3f32041a27ff7b65eb7b9
generated_at: 2026-10-17T02:02:06.241457+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/registry.spec.ts

## Purpose

A cross-cutting spec that iterates the enabled-module registry and asserts invariants every module must satisfy—navigation/route integrity, i18n namespace ownership, and translation-key liveness—without ever naming a specific domain. Deleting any module simply reduces the number of cases exercised; the file never hardcodes a module name, keeping it valid regardless of which modules are present.

## Key elements

- **`routeNamesOf(routes)`** — Recursively collects all `name` strings from a `RouteRecordRaw` tree (any depth).
- **`moduleCases`** — `[name, module]` tuple array derived from `enabledModules`, feeding `describe.each`.
- **Per-module `describe.each` block** — Asserts: navigation entries reference only declared route names; every entry has a numeric `order`; every entry has an `icon`; every entry's `section` is `undefined` or a member of `NAVIGATION_SECTIONS`; every top-level route has a string `name`.
- **`dictionariesFor(locale)`** — Loads the shared locale JSON plus each module's async locale dictionary, returning `{ owner, dictionary }` pairs.
- **`clashesIn(entries)`** — Reduces a set of `{ owner, keys }` into a map of keys claimed by more than one owner.
- **Locale-collision `describe.each` block** — Verifies no top-level i18n key (except the co-owned `navigation` namespace) is declared by two owners, and that every module ships the locale.
- **`CO_OWNED_NAMESPACE`** — `'navigation'`; deliberately excluded from the top-level collision check because all modules contribute `label-*` slices that require deep-merge. Instead, entries *inside* that namespace are checked for individual collisions.
- **`sourceText`** — Concatenated text of every `src/**/*.vue` and `src/**/*.ts` file (via `globSync` + `readFileSync`), read once for the unused-key sweep.
- **`dynamicPrefixes`** — Dot-path prefixes preceding `${` in template literals (e.g. `generic.`), exempting dynamically-built keys from the unused check.
- **`leafPathsOf(dictionary, prefix)`** — Recursively yields full dot-paths of string and array values in a `TranslationDictionaries` tree.
- **Unused-keys `describe.each` block** — Flags any leaf path absent from both the source text and the stringified dictionary values, excluding paths starting with a known dynamic prefix.

## Relationships

- **`src/kernel/registry.ts`** — Imports `NAVIGATION_SECTIONS` to validate that each navigation entry's `section` value belongs to the set the shell actually renders.

## Notes

- The spec is intentionally domain-agnostic: it iterates `enabledModules` (from `@/modules`) and never references a specific module by name. Removing a module reduces test cases but cannot cause a failure.
- `undefined` is a valid `section` value—the shell treats it as `main`.
- In the unused-key check, array values in dictionaries are treated as leaves (read whole via `tm()`/`rt()`), not as traversable containers.
- The unused-key haystack includes `JSON.stringify` of every loaded dictionary, so linked messages (`@:a.b.c`) inside another key's value are counted as usage.
- Dynamic-key exemption is permissive: any key *starting* with a matched template-literal prefix is skipped, even if the suffix is never actually used. False negatives are accepted over blocking the build on false positives.
- The "at least one module" guard (`expect(enabledModules.length).toBeGreaterThan(0)`) prevents the per-module `describe.each` from passing vacuously.
