# src/modules/demo/module.ts

## Purpose

Module manifest that registers the demo "showroom" page (store, toolkit components, notification toasts, provide/inject demo) into the app's module registry. It exists as a self-contained, deletable unit — removing this folder and its single line in `src/modules.ts` cleanly removes the demo from the app with zero residual references.

## Key elements

- **`declare module '@/infrastructure/utils/logger.ts'`** — Declaration merge adding `demo: true` to the `LogScopes` interface, so `logger.debug('demo', …)` type-checks. Removing this file removes the scope.
- **`export default { … } satisfies AppModule`** — The module manifest object containing:
  - `name: 'demo'` — Registry key.
  - `routes` — Imported from `./routes`; the demo page and teaching route guard.
  - `navigation` — A single nav entry ("Playground", icon `FlaskConical`, section `main`, order `20`, label i18n key `navigation.label-playground`).
  - `locales` — Lazy importers for `./locales/en.json` and `./locales/it.json`.

## Relationships

- **`src/modules/demo/routes.ts`** — Imported and passed directly as the manifest's `routes` field. This is the only import from outside `lucide-vue-next` and the kernel type; the manifest is the sole consumer of the routes file.

## Notes

- The declaration merge targets `LogScopes` in `@/infrastructure/utils/logger.ts`. The interface name must match exactly what the logger declares; it is *not* a new interface owned by this module.
- The module intentionally depends on no domain code. If you see imports of business entities here, it is a regression.
- `satisfies AppModule` (not `: AppModule`) is used to keep the literal shape of the object in IDE hover while still enforcing the contract.
