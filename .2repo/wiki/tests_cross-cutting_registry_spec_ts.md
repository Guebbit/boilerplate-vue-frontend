# tests/cross-cutting/registry.spec.ts

## Purpose

Cross-cutting test that validates structural invariants **every** enabled module must satisfy, without ever naming a specific domain. It iterates the module registry generically so that removing a module simply shrinks the test surface rather than breaking the spec. It exists to catch silent, non-throwing regressions: dangling navigation links, missing icons or route names, and i18n dictionary key collisions that would otherwise surface only as a human noticing raw keys on screen.

## Key elements

- **`routeNamesOf(routes)`** — recursively flattens a `RouteRecordRaw` tree into a string[] of all declared route names (any depth).
- **`moduleCases`** — `[name, module]` tuples derived from `enabledModules`, used as the argument list for `describe.each`.
- **`describe('the enabled registry')`** — a single guard assertion (`length > 0`) so the per-module suite is never vacuously green.
- **`describe.each(moduleCases)` block** — five per-module checks:
  - Every `navigation[].name` must exist in the module's own declared routes.
  - Every `navigation[].order` must be a number.
  - Every `navigation[].icon` must be defined (the desktop bar renders only the icon).
  - Every `navigation[].section` must be `undefined` or a member of `NAVIGATION_SECTIONS`.
  - Every top-level route must have a `string` name.
- **`CO_OWNED_NAMESPACE`** (`'navigation'`) — the one i18n namespace intentionally shared across modules; checked one level deeper than other namespaces.
- **`localeCodes`** — deduplicated union of all locale keys across enabled modules' `locales` maps.
- **`dictionariesFor(locale)`** — async loader that returns the shared `@/locales/<locale>.json` (owner `'<shared>'`) plus every enabled module's per-locale dictionary, labelled by owner.
- **`clashesIn(entries)`** — given `{owner, keys}[]`, returns a map of key → owners for any key declared by more than one owner.
- **`describe.each(localeCodes)` block** — three per-locale checks:
  - No top-level namespace (excluding `navigation`) is claimed by more than one owner.
  - No entry *inside* the shared `navigation` namespace is claimed by more than one owner.
  - Every enabled module ships a dictionary for the locale (no domain left untranslated).

## Relationships

- **`src/modules/*/module.ts`** — the file imports `enabledModules` from `@/modules` and reads each module's `routes`, `navigation`, and `locales` fields. It is the primary consumer being tested.
- **`docs/reference/tests.md`** — documents the testing conventions this spec exemplifies: cross-cutting specs must iterate the registry and never hardcode a domain name.

## Notes

- **Never name a domain.** The file deliberately references modules only via `appModule.name` in test labels. Deleting any module (e.g. `products`) keeps every assertion passing with one fewer iteration—this is the contract described in the file's header.
- **`undefined` section is valid.** The shell interprets a missing `section` as `"main"`; the assertion explicitly allows it via `[undefined, ...NAVIGATION_SECTIONS]`.
- **i18n deep-merge order matters.** Dictionaries are deep-merged at boot in registration order; a top-level key collision silently discards the earlier module's entries. The collision check exists because nothing at runtime throws or logs.
- **`navigation` is the one shared namespace.** Because the merge *must* be deep for this namespace, the ownership check drops one level down to individual entries inside it rather than checking the top-level key itself.
- **Shared locale JSON participates in collision checks.** It is loaded as owner `'<shared>'` and included in the same `clashesIn` pass as module dictionaries.
