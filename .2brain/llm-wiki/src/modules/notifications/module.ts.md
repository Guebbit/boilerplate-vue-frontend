---
source: src/modules/notifications/module.ts
sha256: 5edec15fdea16571e232a38f58a9ad0493a68ab6f1079ea279353c975b7031f9
generated_at: 2026-10-17T01:08:51.701874+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/module.ts

## Purpose

Module manifest for the notifications feature. It registers a lazily-loaded bell component in the shell's `app-bar` slot, provides response schemas and locale loaders for the app registry, and declares **no** routes or sibling dependencies. The module is purely a read/render surface: the server produces notifications (product removed from cart/wishlist, guest-cart merge refusal), pushes them over SSE, and this module only displays them.

## Key elements

- **`export default {…} satisfies AppModule`** — the manifest object. Fields:
  - `name: 'notifications'`
  - `routes: []` — the module contributes no navigation entries.
  - `responseSchemas` — lazy-imports `./response-schemas` and resolves `notificationsResponseSchemas`.
  - `locales` — `en` and `it` loaders that lazy-import a JSON file and pass it through the shared `dictionary` helper from `@/kernel/registry`.
  - `slots['app-bar']` — a single entry wrapping `./components/NotificationsBell.vue` in `defineAsyncComponent` so the bell, its panel, and its store stay out of the eager entry chunk.
- **`dictionary`** (imported from `@/kernel/registry`) — normalises a raw locale JSON into the registry's expected shape before it is stored.
- **`defineAsyncComponent`** (from `vue`) — defers mounting of the bell until the slot is actually rendered.

## Relationships

None. The dependency graph lists no neighbors; the module imports only `vue` and the kernel registry, and no other module is known to import this file.

## Notes

- The module is explicitly a *courtesy surface*: removing it costs the user a notification message, never a functional capability. No producer module is imported here, and no consumer module imports this one.
- Because the bell is the sole UI hook, any change to the `app-bar` slot contract in the shell directly affects this module.
- `satisfies AppModule` means the shape is checked against the registry type without widening the literal, so adding/removing fields here will be a compile error if they violate `AppModule`.
