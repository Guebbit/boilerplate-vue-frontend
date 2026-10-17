---
source: src/kernel/registry.ts
sha256: 92e28a0d73089347b9e3c1ed1c45d035b8ae580055089b88dfa171e383da2465
generated_at: 2026-10-17T00:13:38.552626+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/registry.ts

## Purpose

Defines the module-registry contract: the `AppModule` manifest shape, the `AppNavigationEntry` shape, and boot-time helpers that turn the explicit list in `src/modules.ts` into a runnable application (route collection, duplicate-route detection, locale-dictionary unwrapping). It exists so that "what does this domain touch" is answerable from one typed object rather than by grepping across ten files.

## Key elements

- **`AppNavigationSection`** (`'main' | 'account' | 'admin'`) — the three chrome placement zones.
- **`NAVIGATION_SECTIONS`** — the ordered list used by the mobile drawer headings.
- **`AppNavigationEntry`** — one menu item a module contributes: route name, i18n label (with optional plural index), sort order, optional reactive `badge`/`detail` accessors, placement (`section`, `pinned`, `group`), and a required lucide `icon` component.
- **`AppModule`** — the manifest a module exports: `name`, `routes`, optional `navigation`, `slots`, `loadingKeys`, `responseSchemas` (lazy loader), and `locales` (per-locale lazy dictionary loaders).
- **`dictionary`** — unwraps a locale JSON module's `default` export; kept separate so the `import()` specifier stays a Vite-resolvable literal at every call site.
- **`assertUniqueRoutes`** — walks the full route tree (including nested `children`) and throws on the first duplicate name or normalised path, catching collisions that vue-router would only console-warn.
- **`routeIdentitiesOf` / `normalisedSegment`** (module-private) — helpers that recursively flatten a route tree into `{name, path}` pairs and normalise leading/trailing slashes for comparison.

## Relationships

- **`src/i18n/index.ts`** — imports the `TranslationDictionaries` type, which types the `AppModule.locales` field and the `dictionary` helper's return value.
- **`tests/cross-cutting/registry.spec.ts`** — the spec that validates every declared entry's required fields (notably `icon`); the `icon` field is marked required so a missing icon is a compile error here rather than a later test failure.
- **`src/kernel/slots.ts`** (via `@/kernel/slots`) — provides the `SlotName` / `Slots` types used by `AppModule.slots`, letting a module contribute components to another module's slot without the owner importing the contributor.
- **`src/infrastructure/http/response-schema-map.ts`** — provides the `ResponseSchemaRoute` type that `AppModule.responseSchemas` resolves to, keeping each domain's contract-validation schemas inside its own folder.

## Notes

- The registry does **not** discover modules from the filesystem; `src/modules.ts` is the single source of truth for what ships. Enabling/disabling a domain is a one-line list edit.
- `badge` and `detail` are accessors (`() => Ref<…>`), not raw numbers/strings. The shell calls them once inside component `setup` (after Pinia is installed) and renders the resulting ref reactively, never needing to know which store owns the value.
- `order` values are intentionally spaced by tens so a new entry can be slotted between two existing ones without renumbering.
- `AppNavigationEntry` carries **no** visibility/permission field by design; who may see an entry is decided solely by the route's `meta.access`. Placement fields (`section`, `pinned`, `group`) are presentation-only.
- `responseSchemas` and `locales` are lazy loaders (returning `Promise`), not eagerly-imported values, so the ~350 KB API-schemas chunk and per-locale dictionary chunks are only downloaded when actually needed.
- The file mirrors the backend registry's `name` / `routes` field names but replaces Express routers with `vue-router` records and drops `basePath` (each vue-router record carries its own path).
