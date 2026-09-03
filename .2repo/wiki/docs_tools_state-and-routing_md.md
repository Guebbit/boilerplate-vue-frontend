# docs/tools/state-and-routing.md

## Purpose

Documents the three cross-cutting libraries that manage reactive state (Pinia), URL-to-view mapping (Vue Router), and localisation (Vue I18n). It exists so a developer or AI assistant can understand *where* state lives, *how* routes are assembled, and *how* translations are resolved without reading every module individually.

## Key elements

- **Pinia stores** — reactive state + actions wrapping the generated API client. Notable stores:
  - `src/infrastructure/session.ts` — token, `isAuth`/`isAdmin`, viewer projection, refresh, logout-all.
  - `src/modules/account/stores/{auth,profile,sessions,addresses}.ts` — login/signup, editable user record, device sessions, address book.
  - `src/infrastructure/observability/store.ts` — Faro/Umami init, `track()`, `captureException()`, `identifyUser()`.
  - `src/modules/realtime/store.ts` — SSE connection state, live metrics stream.
  - `src/modules/demo/store.ts` — minimal Pinia example.
  - Domain stores: `src/modules/<name>/store.ts` (cart, orders, products, wishlist, etc.).
- **Vue Router** — each module ships a `routes.ts`; `src/app/router/index.ts` splices them under a `/:locale` parent. Guards: `tryRestoreAuth` → `enforceRouteAccess` → `localeChoice` → render → `track(page_view)`. Error routing maps 401/403/5xx/unhandled errors to Login or Error views.
- **Vue I18n** — shared copy in `src/locales/`, per-module copy in `src/modules/<name>/locales/`. Modules declare dictionaries in their `module.ts`; `src/main.ts` calls `registerLocaleContributors` to deep-merge them into the active locale at boot.

## Relationships

- **docs/modules/account.md** — owns the four account Pinia stores (auth, profile, sessions, addresses) referenced here.
- **docs/modules/realtime.md** — owns `src/modules/realtime/store.ts` (SSE state) listed in the store table.
- **docs/modules/demo.md** — owns the counter example store used as a Pinia reference.
- **docs/modules/locales.md** — provides `supportedLanguages` and the `GET /locales` boot call that the `localeChoice` guard validates against.
- **docs/modules/products.md**, **cart.md**, **orders.md**, **wishlist.md**, **delivery.md**, **feedback.md**, **inventory.md**, **payments.md**, **users.md** — each contributes a `routes.ts`, a `store.ts`, and a `locales/` directory that the router and i18n boot process consume.
- **docs/modules/index.md** — barrel/registry that the router splices and `main.ts` iterates for locale contributors.
- **docs/index.md** — top-level navigation entry point for this tools section.

## Notes

- **Call `useXStore()` inside functions, never at module top level** — doing so creates circular-dependency issues (explicitly called out in the usage pattern).
- **Domain stores are reached via the module barrel** (`@/modules/<name>`), never by direct file path.
- **`infrastructure/i18n/index.ts` must not import `@/modules`** — locale contributors are handed in from `main.ts` to preserve this boundary.
- **Locale dictionaries are merged at runtime (boot), not at build time** (decision D6), so each dictionary stays a lazy-loaded chunk.
- **Deleting a domain module removes its locale keys with it** — there is no central key to prune, by design.
- The `localeChoice` guard both validates the `/:locale` segment *and* injects the default (`VITE_APP_DEFAULT_LOCALE`) when the segment is absent.
