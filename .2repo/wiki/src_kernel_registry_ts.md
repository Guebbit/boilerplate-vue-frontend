# src/kernel/registry.ts

## Purpose

Defines the typed manifest that each domain module contributes to the application and provides the collector/utility functions that turn the flat list in `src/modules.ts` into runnable artifacts (route records, navigation entries, response schemas, locale loaders). It exists so that "what does this build contain?" is answerable from one explicit, statically-typed list rather than filesystem discovery.

## Key elements

- **`AppNavigationSection`** — union type `'main' | 'account' | 'admin'` identifying where an entry lives in the app chrome.
- **`NAVIGATION_SECTIONS`** — ordered const tuple of all sections, used for drawer heading order.
- **`AppNavigationEntry`** — shape of a single navigation item a module contributes (route name, i18n label, optional `plural`, `order`, `badge`, `section`, `pinned`, `detail`, `icon`). Notably carries **no** visibility flag; access is inherited from the route's `meta.access`.
- **`AppModule`** — the manifest interface: `name`, `routes`, optional `navigation`, `responseSchemas`, `locales`. Kept intentionally small; domain-specific metadata belongs in the module's own barrel.
- **`collectModuleRoutes(appModules)`** — flat-maps all modules' `routes` arrays.
- **`collectModuleNavigation(appModules)`** — flat-maps all modules' `navigation` arrays (does **not** sort or filter by permission).
- **`sortNavigation(entries)`** — stable sort by `order`; absent `order` sorts last. Uses `toSorted` so the caller's array is not mutated.
- **`groupNavigation(entries)`** — sorts once, then buckets entries into `{ main, account, admin }`, all keys always present.
- **`collectModuleResponseSchemas(appModules)`** — flat-maps all modules' `responseSchemas`.
- **`collectModuleLocales(appModules)`** — inverts the module→locale nesting into locale→loaders, for `registerLocaleContributors`.

## Relationships

- **`src/modules.ts`** (imported upstream): the enabled-module list that feeds every `collectModule*` function. This file is the consumer; that file is the configuration.
- **`@/infrastructure/http/response-schema-map`**: supplies the `ResponseSchemaRoute` type used by `AppModule.responseSchemas` and `collectModuleResponseSchemas`.
- **`@/infrastructure/i18n`**: supplies the `TranslationDictionaries` type used by `AppModule.locales` and `collectModuleLocales`.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`**: exercises the locale-aggregation pipeline that `collectModuleLocales` feeds into; the spec validates that per-module dictionary loaders composed by this registry are correctly merged and loaded per locale.

## Notes

- **No filesystem discovery.** Enabling/disabling a domain is a one-line edit in `src/modules.ts`, not a folder move. This keeps the build tree-shakeable and the set of modules statically known.
- **`order` is spaced by tens** so new entries can be slotted between existing ones without renumbering. Absent `order` sorts last by design.
- **Permission is never duplicated** in `AppNavigationEntry`. Visibility is derived from the route's `meta.access`; the navigation entry only controls *placement* (section, pinned). Filtering by permission happens in the consuming component (`AppNavigation.vue`), not in this file.
- **`badge` and `detail` are accessor functions** (`() => Ref<…>`), not raw values. The shell calls them once in `setup` and renders the ref; the module owns the reactive state. This keeps the kernel decoupled from any specific Pinia store.
- **`icon` is typed as Vue `Component`**, not a lucide-specific type, so the kernel has no dependency on the icon library. A cross-cutting spec enforces that every entry provides one.
- **Cross-module coupling is enforced by ESLint** (`no-restricted-imports`), not by a `dependsOn` field on this manifest. The enforceable boundary is the import graph; the documentary boundary is the docblock prose.
