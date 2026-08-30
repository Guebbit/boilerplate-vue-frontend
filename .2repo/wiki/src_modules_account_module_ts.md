# src/modules/account/module.ts

## Purpose

Module manifest for the `account` domain (login, signup, profile, password reset, deletion). Exports a plain object satisfying `AppModule` that is registered by name in the kernel registry, declaring which routes, nav entries, response schemas, and locale loaders this module contributes when enabled.

## Key elements

- **`export default { … } satisfies AppModule`** — the sole export. A manifest object with the following keys:
  - `name` — the registry key (`'account'`).
  - `routes` — imported from `./routes`; the route table for the module's pages.
  - `navigation` — a single nav entry (label `navigation.label-profile`, section `account`, order 70, icon `IdCard` from `lucide-vue-next`).
  - `responseSchemas` — imported from `./response-schemas` as `accountResponseSchemas`.
  - `locales` — lazy `en` / `it` JSON dictionaries via dynamic `import('./locales/*.json')`.

## Relationships

- **`./routes`** (`src/modules/account/routes.ts`) — imported and assigned to `routes`; supplies the route definitions this manifest advertises to the kernel.
- **`./response-schemas`** (`src/modules/account/response-schemas.ts`) — imported as `accountResponseSchemas` and assigned to `responseSchemas`; provides the validation shapes the kernel uses for this module's API responses.
- **`@/kernel/registry`** — type-only import of `AppModule`; the structural contract this object must satisfy.

## Notes

- There is deliberately **no `index.ts` barrel** alongside this file. The codebase convention is: a barrel exists only when another domain imports from the module. `account` is a pure consumer (forms over server-owned rules) and exports nothing others need.
- The module does **not** own session/token state. That lives in `infrastructure/session` so that `infrastructure/http` and router guards can read `isAuth` / `isAdmin` before any domain code executes.
- Form validation rules are sourced from the `users` module's schema barrel (`usersSchema`, `usersPasswordSchema`), not defined locally. A build that includes `account` but excludes `users` would have no field rules to validate against.
