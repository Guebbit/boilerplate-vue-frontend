# tests/cross-cutting/registry.spec.ts

## Purpose

A domain-agnostic Vitest spec that validates structural invariants across **all** enabled modules in the registry: navigation entries must reference declared routes, carry required fields, and live in known sections; i18n dictionaries must not have unowned key collisions; and every module must ship every declared locale. It iterates `enabledModules` rather than naming any domain, so deleting a module simply removes one iteration without breaking the spec.

## Key elements

- **`routeNamesOf`** — recursively flattens a `RouteRecordRaw[]` tree into a flat list of string route names (including children at any depth).
- **`moduleCases`** — `[name, appModule]` tuples derived from `enabledModules`; drives the `describe.each` block that runs per-module checks.
- **`CO_OWNED_NAMESPACE`** (`'navigation'`) — the single top-level i18n key that modules are *expected* to co-own; collision checks for it descend one level deeper than for all other keys.
- **`localeCodes`** — deduplicated set of locale codes across all enabled modules' `locales` objects.
- **`dictionariesFor(locale)`** — Promise-based loader that resolves the shared `@/locales/<locale>.json` *and* each module's async `locales[locale]()` factory, tagging each with its owner.
- **`clashesIn(entries)`** — given `{owner, keys}[]`, returns a map of key → owners for keys claimed by more than one contributor.
- **Per-module tests** — assert: ≥ 1 enabled module (anti-vacuity); every `navigation` entry's `name` exists in the module's route tree; `order` is a number; `icon` is defined; `section` is `undefined` or a value in `NAVIGATION_SECTIONS`; every top-level route has a string `name`.
- **Per-locale tests** — assert: no top-level dictionary key (except `navigation`) is declared by > 1 owner; no key *within* `navigation` is declared by > 1 owner; every enabled module provides that locale.

## Relationships

The dependency graph reports no neighbors for this file. It does import `enabledModules` (`@/modules`), `NAVIGATION_SECTIONS` (`@/kernel/registry`), the `TranslationDictionaries` type (`@/infrastructure/i18n`), and `RouteRecordRaw` (`vue-router`), and dynamically imports `@/locales/*.json` at test time, but none of these appear as graph edges.

## Notes

- **Anti-vacuity guard:** the very first test asserts `enabledModules.length > 0`. Without it, every `describe.each` block would silently pass zero iterations if the registry were empty.
- **`navigation` namespace is intentionally shared.** All modules contribute `navigation.label-*` slices; the spec checks uniqueness one level *inside* that object rather than at the top level. Do not "fix" this by renaming.
- **`section: undefined` is valid.** The shell interprets it as `"main"`. The test explicitly allows it alongside the values in `NAVIGATION_SECTIONS`.
- **The spec catches silent runtime failures, not crashes.** A navigation entry pointing at a non-existent route only produces a console warning from `vue-router`; a dictionary key collision causes the later-registered module's value to silently overwrite the earlier one during the deep-merge at boot.
- **Dynamic locale imports** (`import(\`@/locales/${locale}.json\`)`) mean the set of importable files is determined at runtime by the registry, not by a static import list.
- The file's doc-comment references `docs/theory/modules.md` as the design authority for why a cross-cutting spec must iterate rather than name.
