# docs/reference/src-app.md

## Purpose

Reference map for the application-tier files: the boot sequence, root component, module registry, application shell (router, guards, layouts, views), and shared type definitions. It exists so a reader can locate *where* each concern lives in `src/` without opening every file, and to show how the kernel's typed-module model flows into the concrete app shell.

## Key elements

- **`src/main.ts`** – Boot sequence. Creates the Vue app, installs Pinia, router, vue-i18n, Vuetify, and observability plugins, then mounts. The sole file that encodes ordering.
- **`src/App.vue`** – Root component; intentionally near-empty (`<RouterView />` + docblock). Domain state lives in modules, not here.
- **`src/modules.ts`** – Explicit list of enabled domains (one import, one array entry each). Enabling/disabling a domain is a one-line change; no filesystem discovery.
- **`src/kernel/registry.ts`** – Typed definition of what a module declares (name, routes, store, locales, navigation) and validates the set at boot. The architectural thesis of the repo.
- **`src/app/router/`** – Router built from the registry; names no domain. Contains `navigation.ts` (unauthenticated redirect + shell nav entries).
- **`src/app/guards/`** – `authentications.ts` (per-route access; absence = public) and `locale-choice.ts` (resolves locale, assembles dictionary).
- **`src/app/layouts/` & `src/app/components/`** – Page chrome (`LayoutDefault.vue`), navigation (`AppNavigation`, `AppNavMenu`, `AppNavIconButton`), `AppLanguageSwitcher`, `AppHealthBanner`. All built from registry entries, not hardcoded lists.
- **`src/app/views/`** – `Home.vue` (landing, renders enabled modules' offers), `Error.vue` (catch-all incl. 404), `StaticPage.vue` (one component for all prose pages; copy from dictionaries).
- **`src/types/`** – `index.ts` (single re-export path), `api.ts`, `http.ts`, `realtime.ts`, `asyncapi.generated.ts` (generated; never hand-edited).
- **`src/locales/*.json`** – App-level translation bundles (navigation, generic errors, shared chrome). Module-owned strings live in `src/modules/*/locales/`.

## Relationships

- **`src/main.ts`** – The sole graph neighbor. It is the entry point that imports `App.vue`, resolves `modules.ts`, and installs every plugin before mounting. All other files on this page are *consumed* by that boot sequence rather than importing it back. `main.ts` is the only place the install order is expressed; every other file is order-independent.

## Notes

- Dependency direction is strictly `infrastructure → kernel → modules → app`; `eslint.config.ts` enforces it. A file in `src/app/` must not import from `src/kernel/` directly except through the registry value a module provides.
- Access control is *per-route and opt-in*: no guard on a route means public. Do not infer access from route nesting.
- Navigation is assembled from registry `section` groupings at runtime; there is no static nav list to keep in sync.
- `src/types/asyncapi.generated.ts` is produced by `npm run gen:asyncapi`. The CI check (`npm run check:asyncapi-types`) fails if the committed copy diverges from a fresh generation.
- Adding a new static page (about, FAQ, etc.) is a route entry plus dictionary keys, not a new Vue component.
