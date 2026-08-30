# docs/modules/demo.md

## Purpose

Documentation for the `demo` module — a single-screen boilerplate showcase that exercises the toolkit (store, provide/inject, toasts, route guard). It is intentionally isolated: no other module imports it and it imports nothing, so it can be deleted with `rm -rf` plus one line in `src/modules.ts`.

## Key elements

- **`module.ts`** — The manifest; the only file the application loads directly. Declares routes, navigation entries, and locales.
- **`store.ts`** — Pinia store `counter` with `count` state, `doubleCount` getter, `increment` / `incrementDelayed` actions.
- **`views/Playground.vue`** — The sole screen (route `Playground`, path `playground`, public access). Reads the store, renders components, no fetching logic.
- **`guards.ts`** — A teaching route guard, kept out of production builds.
- **`provided.ts`** — Sample data for the showcase so no screen invents inline fixtures.
- **`components/ProvidedVariableCard.vue`** — Component owned by this domain; internal unless a sibling imports it.
- **`locales/en.json` / `locales/it.json`** — Per-language translation chunks.
- **`routes.ts`** — Route records spliced into the localised route tree.
- **Tests** — 3 Vitest suites (`guards.spec.ts`, `routes.spec.ts`, `store.spec.ts`) and 1 Cypress suite (`e2e/a11y.cy.ts`).

## Relationships

- **`docs/getting-started.md`** — The getting-started guide points readers to this demo as the first thing to open and run, establishing it as the canonical "hello world" for the boilerplate.

## Notes

- This is the only module with **no backend counterpart**; it pairs with the demo profile and seeded dataset rather than any server domain.
- It publishes no barrel file, so no sibling can import from it.
- The store is deliberately named `counter` — the smallest possible store, meant to be read while learning what a store is.
- Menu entries never restate `meta.access`; the route's own `meta.access` is the single source of truth to prevent menu/router drift.
- Deleting this module and its line in `src/modules.ts` breaks nothing else.
