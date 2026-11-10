---
source: tests/cross-cutting/registry.spec.ts
sha256: ed165aca1b25aa1f036250d5eca22fcc57e365d23f108345a403a7280bde1104
signature: b2ada63e0ab6ef1fe1ee5c26886da7381a48ceb760838d8f687ac3d9b4456d4c
generated_at: 2026-11-10T06:40:24.940991+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/registry.spec.ts

## Purpose

Cross-cutting invariant tests that iterate every enabled module in the registry and assert structural rules each one must satisfy (navigation entries, route naming, i18n dictionaries) **without naming any specific domain**. The file is designed to keep passing when a module is deleted — it simply tests one fewer case. It exists to catch silent failures (broken navigation links, duplicate i18n keys, missing locale coverage) that no per-module spec or runtime warning would gate.

## Key elements

- **`routeNamesOf(routes)`** — recursively collects every string `name` in a `RouteRecordRaw[]` tree, used to verify navigation entries reference declared routes.
- **`moduleCases`** — one `[name, module]` tuple per entry in `enabledModules`, feeding `describe.each` so each module gets its own suite.
- **"contributes navigation entries that point at routes it declares"** — asserts every `navigation[].name` exists in the module's own route tree.
- **"gives every navigation entry an order / an icon"** — enforces `order` is a number and `icon` is defined, preventing blank UI slots.
- **"places every navigation entry in a section the shell knows how to draw"** — validates `entry.section` is `undefined` (shorthand for `main`) or a value from `NAVIGATION_SECTIONS`.
- **"names every route it declares"** — requires `typeof route.name === 'string'` on every top-level route.
- **`CO_OWNED_NAMESPACES`** — the four i18n namespaces (`navigation`, `task-kind`, `task-category`, `task-link`) that are intentionally shared across modules; collisions are checked one level deeper.
- **`dictionariesFor(locale)`** — async loader that resolves the shared `@/locales/<locale>.json` plus every enabled module's per-locale dictionary into a labelled `{owner, dictionary}[]`.
- **`clashesIn(entries)`** — builds a `key → owners[]` map and returns only keys claimed by more than one owner.
- **"gives every top-level namespace exactly one owner"** / **"gives every %s entry exactly one owner"** — the two collision checks (top-level and co-owned-namespace level).
- **"is shipped by every module"** — asserts no enabled module is missing a dictionary for the locale under test.

## Relationships

- **`src/kernel/registry.ts`** — imported for `NAVIGATION_SECTIONS`, the closed set of valid navigation section identifiers. The spec uses it as the membership oracle for the "section" assertion; it is the single coupling point to the kernel.
- **`@/modules`** — source of `enabledModules`; the entire test surface scales with whatever is registered there.
- **`@/i18n`** — type-only import for `TranslationDictionaries`, shaping the i18n collision checks.
- **`vue-router`** — type-only import for `RouteRecordRaw`, the shape `routeNamesOf` walks.

## Notes

- The spec deliberately avoids hardcoding any module name. Adding or removing a module changes the number of `it` blocks but never requires editing this file.
- `CO_OWNED_NAMESPACES` is the one place the spec "names" a domain-agnostic concept: those four namespaces are expected to be shared, so the collision check drills **into** them rather than treating a shared top-level key as a failure.
- The i18n collision checks are async (dynamic `import` of JSON + module-locale promises) but use `expect(...).toEqual({})` inside the `.then` — a rejection there surfaces as an unhandled promise, not a Vitest failure, unless Vitest's `testTimeout`/`unhandledRejection` handling catches it.
- `undefined` for `entry.section` is explicitly valid (shorthand for `main`); the test includes `undefined` in its allowed-values array for this reason.
- The "at least one module" guard test prevents all subsequent sweeps from being vacuously true if `enabledModules` is ever empty.
