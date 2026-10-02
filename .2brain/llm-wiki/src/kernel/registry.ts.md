---
source: src/kernel/registry.ts
sha256: 5451465c88ba98f07ec379118a1d8a36e2115eac689cb14f1e3900869199339f
generated_at: 2026-10-02T12:07:32.012913+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/registry.ts

## Purpose

Defines the contract a domain module uses to declare itself to the application shell. It is the single typed object (`AppModule`) through which a module exposes its routes, navigation entries, slot contributions, loading keys, response-schema loaders, and locale dictionaries. The file also provides boot-time validation (`assertUniqueRoutes`) and a small set of pure helpers for unwrapping locale JSON and normalising route paths. It does not discover modules from the filesystem; `src/modules.ts` supplies the explicit list, and this file turns that list into a running app.

## Key elements

- **`AppNavigationSection` / `NAVIGATION_SECTIONS`** — Union type (`'main' | 'account' | 'admin'`) and the ordered tuple that drives the mobile drawer's section headings.
- **`AppNavigationEntry`** — Shape of one menu item a module contributes. Carries route name, i18n label, optional plural index, sort `order`, reactive `badge`/`detail` accessors, `section` placement, `pinned` flag, and a required `icon` (typed as `Component`, not a lucide type).
- **`AppModule`** — The top-level manifest: `name`, `routes`, optional `navigation`, `slots`, `loadingKeys`, `responseSchemas` (lazy loader), and `locales` (per-locale lazy loaders).
- **`dictionary`** — Trivial unwrapper for a locale JSON's `default` export; keeps the `import()` specifier literal at call sites so Vite resolves it statically.
- **`assertUniqueRoutes`** — Walks every route record (including nested `children`) and throws on the first duplicate name or normalised path. Called once at boot across all modules plus the shell's own routes.
- **`collectModuleRoutes`** — Flattens all enabled modules' `routes` arrays into one list, then delegates to `assertUniqueRoutes` before returning.
- **`normalisedSegment` / `routeIdentitiesOf`** — Internal helpers: strip slashes and recursively collect `{ name, path }` pairs from a route tree.

## Relationships

- **`src/i18n/index.ts`** — Imports the `TranslationDictionaries` type, which `AppModule.locales` and the `dictionary` helper reference. The locale loaders in a module resolve to objects of this type.
- **`src/modules/locales/store.ts`** — A concrete module whose manifest conforms to `AppModule`; its `locales` field exercises the per-locale lazy-loader contract defined here.
- **`src/modules/locales/views/EntityTranslations.vue` / `LocaleEntries.vue`** — Views inside the locales module; they are the runtime consumers of the translation dictionaries that the registry's `locales` field makes available.
- **`tests/cross-cutting/registry.spec.ts`** — Exercises `assertUniqueRoutes` and the navigation-entry invariants (e.g., required `icon`, valid `section` values) against the full enabled-module list.

## Notes

- **Placement ≠ permission.** `section` and `pinned` on a navigation entry are purely chrome layout. Visibility is always derived from the route's `meta.access`; the entry deliberately has no visibility flag to avoid a second, disagreeable source of truth.
- **`badge` / `detail` are accessors, not values.** They return `Ref<number | undefined>` / `Ref<string | undefined>` and are called once inside the shell's `setup`. This lets the shell render reactive state without importing or knowing about the module's store.
- **`locales` and `responseSchemas` are lazy loaders, not imported objects.** Each is a `() => Promise<…>` so the corresponding chunk (locale JSON, `@api/schemas`) is downloaded only when actually needed. The `import()` specifier at each call site must remain a literal string for Vite's static analysis.
- **`icon` is required, not optional.** A missing icon is a compile-time error at the module's declaration site rather than a later test failure.
- **No filesystem discovery.** The module list is an explicit array in `src/modules.ts`. Enabling/disabling a domain is a one-line edit, keeping the build statically typed and tree-shakeable.
