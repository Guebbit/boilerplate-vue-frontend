# src/modules/demo/guards.ts

## Purpose

A single demo route guard for the Playground route. It exists to show, in one place, what is and isn't reachable from a Vue Router `beforeEnter` hook: Pinia stores work fine, i18n translations are not yet loaded (the dictionary loads later, in `beforeResolve`), and injected variables are unavailable because a guard has no component scope.

## Key elements

- **`exampleGuard`** (exported function) — A `beforeEnter`-style guard that takes a `RouteLocationNormalized`. It increments `count` in the demo Pinia store, logs both the store read and an i18n `t()` call (which will return the raw key at this point), and returns `void` to let navigation proceed. Deliberately avoids the deprecated `next()` callback.

## Relationships

- **`src/modules/demo/routes.ts`** — Registers `exampleGuard` as the `beforeEnter` guard on the Playground route.
- **`src/modules.ts`** — Top-level module registry; includes the demo module that exposes this file.
- **`src/modules/demo/tests/routes.spec.ts`** — Tests the Playground route; exercises (or stubs) the guard's side effects on the store.
- **`src/modules/demo/views/Playground.vue`** — The route component this guard gates; the guard runs before this component's setup.

## Notes

- The i18n `t()` call in the guard **always returns the raw key** (e.g. `"generic.loading"`), because `localeChoice` loads the dictionary in `beforeResolve`, which runs after every `beforeEnter`. This is intentional and documented inline.
- Returning `void` (rather than calling `next()`) is required in Vue Router 4; using the callback emits a deprecation warning on every hit.
- The file is explicitly labelled "DUMMY" / demo — it is not intended as a production pattern.
