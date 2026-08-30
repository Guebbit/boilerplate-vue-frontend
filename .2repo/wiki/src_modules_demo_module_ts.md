# src/modules/demo/module.ts

## Purpose

Module manifest that registers the demo (showroom) module into the app's module registry. It wires together the demo routes, a navigation entry, and locale loaders under the `AppModule` contract, and declares a typed `demo` scope for the shared logger. The file is intentionally self-contained so the entire demo can be removed by deleting its folder and one import line in `src/modules.ts`.

## Key elements

- **Default export** — an object `satisfies AppModule` with:
  - `name: 'demo'` — registry key.
  - `routes` — re-exported from `./routes`; the single demo page exercising store, toolkit components, toasts, provide/inject, and a teaching route guard.
  - `navigation` — one entry ("Playground", `FlaskConical` icon, `order: 20`, `section: 'main'`) that appears in the app nav.
  - `locales` — lazy loaders for `./locales/en.json` and `./locales/it.json`.
- **Declaration merge** — augments `LogScopes` in `@/infrastructure/utils/logger.ts` with `demo: true`, making `logger.debug('demo', …)` type-check. Removing this file removes that scope.

## Relationships

- **`src/modules/demo/routes.ts`** — imported and passed directly as the `routes` field; this file does not define any routes itself.
- **`@/kernel/registry`** — provides the `AppModule` type that the default export must satisfy.
- **`@/infrastructure/utils/logger.ts`** — augmented via declaration merge to add the `demo` log scope.
- **`lucide-vue-next`** — source of the `FlaskConical` nav icon.

## Notes

- The declaration merge targets `interface LogScopes` in the logger module, not an interface local to this file. The comment in the source clarifies that the name belongs to the augmented module.
- The module is explicitly dependency-free at the domain level: nothing imports it except the one-line registration in `src/modules.ts`, and it imports no domain code. Treat it as a disposable showcase, not a production concern.
- `plural: 1` on the navigation entry is the i18n key selector for the label; the actual string lives in the locale JSON files, not here.
