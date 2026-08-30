# src/kernel/registry.ts

## Purpose

The module registry that turns the explicit module list in `src/modules.ts` into the running application's routes, navigation, response-schema registrations, and i18n locale contributions. It defines the `AppModule` manifest contract and provides pure collector/sorter/grouping functions so the shell (router, navigation bar, i18n setup) can assemble itself from a flat array of modules without any filesystem discovery.

## Key elements

- **`AppNavigationSection`** — union type `'main' | 'account' | 'admin'` controlling where an entry appears in the shell chrome.
- **`NAVIGATION_SECTIONS`** — ordered const array of the three sections, used by the drawer to render headings.
- **`AppNavigationEntry`** — shape of one navigation item a module contributes (route name, i18n label, optional `order`, reactive `badge`, `section`, `icon`).
- **`AppModule`** — the manifest every module exports: `name`, `routes`, optional `navigation`, `responseSchemas`, and `locales`.
- **`collectModuleRoutes(appModules)`** — flattens all `routes` arrays into a single `RouteRecordRaw[]`.
- **`collectModuleNavigation(appModules)`** — flattens all `navigation` arrays (omitting modules that have none). Does **not** sort or filter by permission.
- **`sortNavigation(entries)`** — stable sort by `order` (absent → last) using `toSorted` (non-mutating).
- **`groupNavigation(entries)`** — sorts once, then buckets into `{ main, account, admin }`; every key is always present.
- **`collectModuleResponseSchemas(appModules)`** — flattens all `responseSchemas` for downstream `registerResponseSchemas`.
- **`collectModuleLocales(appModules)`** — inverts the module→locale nesting into locale→module-loaders for downstream `registerLocaleContributors`.

## Relationships

- **`src/modules.ts`** — the sole consumer of the collector functions; it holds the enabled `AppModule[]` and passes it to every `collectModule*` call during app bootstrap.
- **`src/app/router/index.ts`** — calls `collectModuleRoutes` to splice module route records into the localised route tree.
- **`src/app/components/AppNavigation.vue`** — calls `collectModuleNavigation`, `sortNavigation`, and `groupNavigation` to build the bar and drawer; performs permission filtering here (not in the registry) because it needs the resolved route and visitor context.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — exercises the locale-grouping shape that `collectModuleLocales` produces (locale-keyed arrays of lazy loaders).

## Notes

- Permission is **never** stored on `AppNavigationEntry`; visibility is derived from the target route's `meta.access`. Do not add a `visible`/`show` field to the entry.
- `badge` is a `() => Ref<number | undefined>` accessor, not a plain number, so the shell stays decoupled from whichever Pinia store owns the count. It is safe to read inside `setup` because Pinia is installed by then.
- `order` values are spaced by tens to allow insertion without renumbering. Absent sorts last via `Number.MAX_SAFE_INTEGER`.
- `AppModule` is intentionally minimal. A field only one module uses should live behind that module's own barrel, not here. See `docs/theory/strategic-ddd.md` §2/§4 for the history of fields that were removed.
- The registry does **not** discover modules from the filesystem; the list is explicit to stay statically typed, tree-shakeable, and auditable.
