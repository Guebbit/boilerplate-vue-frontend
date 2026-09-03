# src/main.ts

## Purpose

The composition root and entry point for the Vue application. It hands module-contributed domain data (response schemas, locale dictionaries) down to the infrastructure tier, then boots the app as a single sequential promise chain—remote-locale merge → mount → observability init → readiness signal—so no step can race the next.

## Key elements

- **Module-scope registrations** (`registerResponseSchemas`, `registerLocaleContributors`) — executed immediately on import, before any async work, so the router's locale guard and the boot-time `/locales` fetch already see the data.
- **`bootstrapApplication()`** — the promise chain:
  1. `createPinia()` + `setActivePinia(pinia)` — activates the store *before* the app exists so the HTTP interceptor can read the session store.
  2. `mergeRemoteLocales()` — fetches languages from the API; never rejects (offline no-op).
  3. `createApp(App).use(pinia).use(router).use(i18n).use(vuetify).mount('#app')` — synchronous mount block.
  4. Observability: `useObservabilityStore().initFaro()` (Grafana Faro) and `.initUmami()` (Umami analytics).
  5. `router.isReady()` → sets `globalThis._appReady = true` for test runners (Cypress).
- **Top-level `.catch`** — logs a fatal bootstrap error via the shared `logger`.

## Relationships

- **`src/App.vue`** — imported as the root component and passed to `createApp(App)`. This is the sole interaction; all child views and routes are resolved by the router, not by this file.

## Notes

- `setActivePinia` is used instead of `app.use(pinia)` because the Vue app instance does not exist yet at activation time. Skipping this causes the request interceptor to throw `getActivePinia() … no active Pinia`, which the `.catch` misreports as "the API offered no languages."
- The two module-scope `register*` calls are deliberately outside `bootstrapApplication` so that the first navigation's locale guard and the boot fetch both find their data already wired.
- `@/styles/main.css` must remain the last style import: it declares the `@layer` order (Vuetify layers → Tailwind utilities) for the entire bundle.
- The `_appReady` flag is a contract with Cypress; removing or renaming it silently breaks test-harness waits.
