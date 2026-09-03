# docs/theory/sitemap.md

## Purpose

Single reference for every route in the application: which module owns it, its path, access level, and view component. It also documents navigation placement (sections, pinned entries), the guard execution order, and the platform-level routes that exist independent of any module. The goal is to make the route table, the module pages, and the navigation chrome agree by construction.

## Key elements

- **Route table** — 30 rows across 12 modules, each row listing module, path, route name, `meta.access` level, and the `.vue` view file. Paths are relative to the locale-prefixed root (`/:locale/…`).
- **Navigation sections** (`main`, `account`, `admin`) — defines where an entry renders on desktop vs. phone drawer, and the `pinned` mechanism that lifts an entry (e.g. cart) into a standalone bar button.
- **Platform routes** — `Home`, `Error`, `StaticAbout`/`faq`/`terms`/`privacy`, and the `:catchAll(.*)` redirect, all sourced from `src/app/router/` rather than a module.
- **Navigation flow (Mermaid diagram)** — documents guard ordering: `beforeEach` (auth restore → access check) runs before `beforeResolve` (locale injection), so unauthorised visitors are redirected before any dictionary fetch.
- **Guard registration table** — `tryRestoreAuth`, `enforceRouteAccess`, `localeChoice`, and the teaching-only `exampleGuard`, with file paths and lifecycle hooks.
- **Auth persistence note** — `tryRestoreAuth` fires on *every* navigation (including public routes) so that admin controls render correctly after a hard reload.

## Relationships

- **Module pages** (`docs/modules/*.md`) — the route table links to each module page; both render the same underlying route records, so they "cannot disagree." Changes to a module's routes must be reflected here.
- **`docs/reference/src-app.md`** — the platform routes (Home, Error, static pages, catch-all) originate in `src/app/router/`, which that page documents.
- **`docs/index.md`** / **`docs/getting-started.md`** — this page is the canonical "what screens exist and who can see them" answer; higher-level docs point here for route-level detail.
- **`docs/theory/request-flow.md`**, **`docs/tools/security.md`**, **`docs/tools/state-and-routing.md`** — listed as related pages; they cover the surrounding machinery (request pipeline, auth token handling, router state) that this page's guard table references.

## Notes

- **Access is declared once** — `meta.access` on the route is the sole permission source; navigation entries inherit it and never restate it.
- **Guard order is load-bearing** — because `beforeEach` precedes `beforeResolve`, an unauthorised user is redirected before the locale dictionary is fetched. Reordering would cause a wasted fetch on every denied navigation.
- **`canAccess` is not a guard** — it is a shared predicate consumed by both `enforceRouteAccess` and `AppNavigation`; do not register it directly on a router hook.
- **`exampleGuard`** is scoped to the `Playground` route only (`beforeEnter`); it is documentation, not application logic.
- **Locale injection** happens in `localeChoice` using `VITE_APP_DEFAULT_LOCALE`; a missing or unsupported `:locale` param triggers a redirect rather than a 404.
- **Pinned entries** still appear in the phone drawer under their section — pinning adds a bar button, it does not remove the drawer listing.
