---
source: src/main.ts
sha256: ac70ea09d7ff97fbd06369d3c24353a5f2551f71b073ec687291372543497c3f
signature: d71babb554177f6275e02415606fe0b93fd927d366b87c8b9897ee2fc0f4ff66
generated_at: 2026-11-10T03:17:47.906941+00:00
model: ollama:qwen3.8:27b
---

# src/main.ts

## Purpose

The composition root and single entry point of the Vue 3 application. It wires infrastructure (Pinia, router, i18n, Vuetify, Vue Query) to module-contributed data (locale dictionaries, notices, response schemas, slots), then boots the app as one sequential promise chain—remote-locale merge → mount → observability → readiness signal—so no step can race the next.

## Key elements

- **Module-scope wiring** (top-level, before `bootstrapApplication`): calls `registerLocaleContributors` and `registerNotices` so that locale dictionaries and notification-code metadata are available the instant the router's locale guard fires on the very first navigation.
- **`bootstrapApplication()`** (const, not exported): the entire boot sequence as a `Promise.resolve().then(…).then(…)` chain.
  - Creates and **activates** Pinia (`setActivePinia`) before any fetch, so the request interceptor can read the session store.
  - Calls `mergeRemoteLocales()` to add API-discovered languages; never rejects (offline-safe).
  - `createApp(App)` → installs `pinia`, `router`, `i18n`, `vuetify`, `VueQueryPlugin` → sets `app.config.errorHandler` → provides `SLOTS_KEY` → `app.mount('#app')`.
  - Post-mount: fire-and-forget `loadResponseSchemas` (only if `shouldValidateResponses()`), `runModuleSetups`, `useSessionStore().loadSessionMode()`, a `watch` on `isAuth` to re-fetch locales on sign-in/out, and `useAnalyticsConsentStore().syncTracker()`.
  - Resolves on `router.isReady()` and sets `globalThis._appReady = true` for test runners.
- **Final invocation**: `void bootstrapApplication().catch(…)` — logs fatal init errors via `logger.error`.
- **CSS/font imports**: `@fontsource/roboto` weights 400/500/700, then `@/styles/main.css` (must come first among CSS to declare `@layer` order), then Vuetify.

## Relationships

- **`index.html`** — provides the `#app` mount target and loads the script bundle that executes this file.
- **`src/App.vue`** — the root component passed to `createApp(App)`; this file is its sole consumer.
- **`src/infrastructure/utils/logger.ts`** — imported and used in two error paths: the top-level `.catch` on `bootstrapApplication` and the `.catch` on the lazy `loadResponseSchemas` call.

## Notes

- **Pinia activation order matters**: `setActivePinia` is called *before* `createApp` because the boot fetch (remote locales) triggers the request interceptor, which reads the session store. Using `app.use(pinia)` here would leave no active Pinia during that fetch, producing a silent "no languages" error indistinguishable from an unreachable API.
- **Response schemas are deliberately excluded from the boot chain**: `loadResponseSchemas` is called with `void … .catch(…)` after mount. It loads ~350 KB of Zod schemas used only for response validation; unvalidated calls in the brief pre-load window fail open (same as any unmapped route).
- **`main.css` import order is contractual**: it must precede Vuetify's CSS to declare the `@layer` order (Vuetify layers → Tailwind utilities).
- **Module-scope wiring ≠ `bootstrapApplication` scope**: `registerLocaleContributors` and `registerNotices` run at import time, not inside the promise chain, because the first navigation's locale guard executes before the chain's first `.then` resolves.
- **`_appReady` global**: set only after `router.isReady()` resolves; consumed by Cypress/test-runner scripts, not by application code.
