# src/main.ts

## Purpose

Composition root and entry point. Wires infrastructure plugins (Pinia, router, i18n, Vuetify) to the enabled modules' contributed data (response schemas, locale dictionaries), then boots the Vue app as a single promise chain so that remote-locale merge, mount, observability init, and the readiness signal execute strictly in sequence.

## Key elements

- **Module-scope registrations** — `registerResponseSchemas(collectModuleResponseSchemas(enabledModules))` and `registerLocaleContributors(collectModuleLocales(enabledModules))` run *before* `bootstrapApplication` is invoked, because the first `mergeRemoteLocales()` fetch and the router's locale guard both need the wiring already in place.
- **`bootstrapApplication()`** — Promise chain:
  1. Creates + activates Pinia (`setActivePinia`) so the HTTP interceptor can read the session store during the locale fetch.
  2. `mergeRemoteLocales()` — asks the API for languages not bundled locally; never rejects.
  3. `createApp(App).use(pinia).use(router).use(i18n).use(vuetify).mount('#app')` — single synchronous block.
  4. `useObservabilityStore()` → `initFaro()` (error/tracing) → `initUmami()` (analytics) → `track(APP_STARTED)`.
  5. `router.isReady()` → sets `globalThis._appReady = true` → `track(APP_READY)`.
- **CSS import order** — `@/styles/main.css` is imported *after* font CSS but before Vuetify, because it declares the `@layer` order for the whole app.
- **Top-level `catch`** — `void bootstrapApplication().catch(...)` logs via `logger.error` with a `[Bootstrap]` prefix.

## Relationships

- **`src/App.vue`** — the root component passed to `createApp` and mounted on `#app`.
- **`src/app/router/index.ts`** — installed via `.use(router)`; its locale guard reads the dictionary registered by `registerLocaleContributors` on first navigation.
- **`src/infrastructure/i18n/index.ts`** — provides the `i18n` plugin and the `registerLocaleContributors` / `mergeRemoteLocales` helpers consumed here.
- **`src/infrastructure/stores/observability.ts`** — `useObservabilityStore()` is called post-mount to drive Faro + Umami init and event tracking.
- **`src/modules.ts`** — exports `enabledModules`, whose response schemas and locale dictionaries are collected and handed down at module scope (inverting what would otherwise be a bottom-tier→top-tier import).
- **`docs/index.md` / `docs/reference/src-app.md`** — documentation that references this file's role as the entry point.

## Notes

- `setActivePinia` is used *instead of* `app.use(pinia)` at activation time because the app instance must not exist yet; the same Pinia instance is later installed via `.use()`. Skipping this causes a silent `getActivePinia()` error inside the HTTP interceptor that surfaces as a misleading "no languages" log.
- The `mergeRemoteLocales()` step is sequenced **before** `createApp`/`mount` specifically so the locale guard's `supportedLanguages` list is already populated; otherwise an API-only language triggers a redirect before it can be offered.
- `globalThis._appReady` is the contract with Cypress (or any e2e runner); do not rename or remove it without updating test config.
- The "one loop the tier rule cannot express" comment documents an architectural constraint: `infrastructure` may not import `@/modules`, so the composition root injects the data downward.
