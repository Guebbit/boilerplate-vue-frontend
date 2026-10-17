---
source: src/main.ts
sha256: 0fcbbce2d36c0617c43476ab58c182b5494cfb672ddb8d3a071bdd2f05c7ae93
generated_at: 2026-10-17T00:14:04.699068+00:00
model: ollama:qwen3.8:27b
---

# src/main.ts

## Purpose

The composition-root entry point. It wires all shared infrastructure (Pinia, router, i18n, Vuetify, Vue Query) together with the data contributed by enabled modules (locale dictionaries, response schemas, slot bindings), then boots the Vue application as a single sequential promise chain so that no step can race the next.

## Key elements

- **`bootstrapApplication()`** — The sole exported logic (called immediately at module scope). A two-stage `Promise.then` chain:
  1. Create & activate Pinia → `mergeRemoteLocales()`.
  2. `createApp(App)` → register plugins (Pinia, router, i18n, Vuetify, VueQuery) → set `app.config.errorHandler` → provide `SLOTS_KEY` → `mount('#app')` → fire-and-forget post-mount tasks (schema load, `loadShop`, `loadSessionMode`, Faro/Umami init) → `router.isReady()` → set `globalThis._appReady`.
- **Module-scope `registerLocaleContributors(...)`** — Runs before `bootstrapApplication` is even invoked, so the i18n runtime has all module dictionaries available the instant the first navigation triggers a locale guard.
- **Lazy response-schema load** — `loadResponseSchemas(...)` is called after mount and explicitly *not* awaited; validation fails open for any request that arrives before the chunk resolves.
- **Top-level catch** — `void bootstrapApplication().catch(...)` logs a fatal error via `logger.error` if any step in the chain rejects.

## Relationships

- **`src/App.vue`** — Imported as the root component and passed directly to `createApp(App)`.
- **`src/infrastructure/utils/logger.ts`** — Imported as `logger`; used in two places: the schema-load `.catch` and the top-level bootstrap `.catch`, both to surface boot-time failures.

## Notes

- **CSS import order is load-bearing.** `@/styles/main.css` must appear before Vuetify/Tailwind imports because it declares the global `@layer` order. Reordering it silently breaks layering.
- **Pinia is activated *before* `createApp`.** The request interceptor reads the session store during `mergeRemoteLocales()`; if Pinia were not yet active, the error would be swallowed by the locale-merge `.catch` and misreported as "API offered no languages."
- **`registerLocaleContributors` is at module scope, not inside the chain.** Placing it inside `bootstrapApplication` would leave a window where the router's locale guard runs before dictionaries are registered.
- **`_appReady` on `globalThis`** is a test-runner signal (Cypress), not a public API.
- **VueQueryPlugin injection** is a safety net only; all existing stores receive `queryClient` explicitly via their constructor.
