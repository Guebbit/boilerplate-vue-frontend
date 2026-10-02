---
source: src/main.ts
sha256: 38bed0732dade56dfbeafe45caf8fa4d530077e14ea6a04f750ad5c3df7ebdc4
generated_at: 2026-10-02T14:43:23.803013+00:00
model: ollama:qwen3.8:27b
---

# src/main.ts

## Purpose

Composition-root entry point. Wires infrastructure (Pinia, router, i18n, Vuetify, Vue Query) to data contributed by enabled modules (locale dictionaries, response schemas, cross-module slots), then boots the application as a single sequential promise chain so that no step can race the next.

## Key elements

- **`registerLocaleContributors(collectModuleLocales(enabledModules))`** — Runs at module scope (before `bootstrapApplication`), handing module-contributed dictionaries down to the i18n runtime. Must precede the first router navigation's locale guard.
- **`bootstrapApplication()`** — The entire boot sequence as one `Promise` chain:
  1. `createPinia()` / `setActivePinia()` — activates the store *before* the remote-locale fetch (so the session store is available to the request interceptor).
  2. `mergeRemoteLocales()` — fetches `/locales` to augment the bundled dictionary set; never rejects.
  3. `createApp(App)` + plugin registration (Pinia, router, i18n, Vuetify, VueQueryPlugin) + `app.config.errorHandler` + `app.provide(SLOTS_KEY, …)` + `app.mount('#app')` — all one synchronous block.
  4. Post-mount side-effects: lazy `loadResponseSchemas` (FA94/FA-D2), `loadShopCurrency`, `observability.initFaro()`, `analyticsConsent.syncTracker()`.
  5. `router.isReady()` → sets `globalThis._appReady` for test runners.
- **CSS import block** — `@fontsource/roboto` weights then `@/styles/main.css`; order is load-bearing for `@layer` declarations.
- **`void bootstrapApplication().catch(…)`** — Top-level invocation; fatal errors are logged, never re-thrown.

## Relationships

- **`src/App.vue`** — The root SFC passed to `createApp(App)`; all plugin registration and slot provision are done on the app instance before `App` is mounted.
- **`src/infrastructure/utils/logger.ts`** — Provides the `logger` singleton used in two error paths: the top-level bootstrap catch and the lazy response-schema load catch.

## Notes

- `setActivePinia` is called *before* `createApp` so the remote-locale fetch (which reads the session store via a request interceptor) cannot hit "no active Pinia." The same Pinia instance is later installed via `app.use(pinia)`.
- `loadResponseSchemas` is deliberately **not awaited** and **not part of the boot chain** (FA94/FA-D2). It loads ~350 KB of Zod schemas after first paint; routes without a mapped schema fail open (unvalidated) during the window before it resolves.
- `registerLocaleContributors` sits at module scope, not inside `bootstrapApplication`, because the router's locale guard on the very first navigation reads `supportedLanguages` and would otherwise see an empty list.
- `loadShopCurrency()` and `loadResponseSchemas()` are fire-and-forget (`void`); a failure is logged but does not block readiness.
- `globalThis._appReady` is the contract for Cypress (or any external test runner) to know the app has mounted and the initial navigation has settled.
