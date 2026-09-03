---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/app/
files: 21
updated: 2026-09-03T10:57:19.799022+00:00
---

# src/app/

## Purpose

The `src/app/` module is the application shell. It owns the global Vue Router instance, route-level access-control and locale guards, the universal page layout, the top navigation bar (desktop and mobile), the health/degradation banner, and the four static prose pages (About, FAQ, Terms, Privacy). It knows nothing about any specific business domain; domain routes and nav entries are injected at runtime through the kernel registry, so removing a module automatically removes its footprint here.

## Key parts

- **Router & guards** — `router/index.ts` is the single Vue Router instance: it prefixes every route with `:locale`, merges in domain routes from the registry, and registers the global guard chain. `guards/authentications.ts` centralises "who may access this route" and performs silent session rehydration before the decision. `guards/locale-choice.ts` syncs the active i18n language to the `:locale` param. `router/announcer.ts` lets the router push a one-off page-title and focus request to the layout without a global store. `router/navigation.ts` exposes sign-in/sign-up route-name constants so the shell can link to auth pages without importing the account module.

- **Navigation & shell components** — `AppNavigation.vue` is the orchestrator: it merges the shell's own entries with module-contributed ones, filters by visitor access rights, and renders the desktop bar, dropdown menus, pinned buttons, and mobile drawer. The individual bar entries are split into `AppNavIconButton` (icon-only), `AppNavBarLink` (icon + label), `AppNavPinnedButton` (icon + count + detail), and `AppNavMenu` (dropdown wrapper around an icon button with ARIA menu semantics). `AppHealthBanner` is a thin conditional banner shown when the API is unreachable. `AppLanguageSwitcher` re-routes the current path under a new `:locale` param.

- **Layout** — `layouts/LayoutDefault.vue` is the single page shell every view renders through: skip link, health banner, nav, hero slot, footer, confirmation-dialog host, toast stack, and loading indicators. It deliberately preloads no domain data.

- **Static views & utilities** — `views/Home.vue`, `AboutPage.vue`, `FaqPage.vue`, `TermsPage.vue`, `PrivacyPage.vue`, and `Error.vue` render the shop's static content, all copy sourced from i18n keys. `utils/static-pages.ts` is the single source of truth for the page list, the name-to-route-name mapping, and the i18n paragraph resolver; `StaticPageLinks.vue` uses it to build the cross-link footer shared across the four prose pages.

## How it connects

`src/app/` sits at the top of the dependency graph and lists no other internal modules as dependencies. It is the outermost layer: domain modules depend *on* it (by contributing routes and nav entries through the kernel registry and by rendering inside `LayoutDefault`), but this module never imports a domain package directly. The only cross-cutting touch-points are the kernel registry (for route/nav merging) and the i18n runtime (for locale dictionary loading), both of which are provided by the application kernel rather than a sibling module.

## Where to start

1. **`src/app/router/index.ts`** — reading this one file reveals how routes are assembled, which guards run in what order, and how domain modules plug in without the shell naming them.
2. **`src/app/layouts/LayoutDefault.vue`** — this is the skeleton every user sees; understanding its slots and lifecycle makes the relationship between the shell and any individual view immediately clear.

## Connected modules
_(none)_

## Files
- `src/app/components/AppHealthBanner.vue` — A thin, always-mounted presentational banner that appears only when the backend API is unreachable. It exists to communicate a *degraded* (not *broken*) state to users, since the app still renders usable content (bundled dictionaries, cached pages) without a live backend.
- `src/app/components/AppLanguageSwitcher.vue` — A Vuetify dropdown menu that lets the user switch the app's display language. The component is intentionally narrow in scope: it handles **only** the routing side of a locale switch (re-entering the current route under the new `locale` param). Dictionary loading is delegated to the i18n runtime and locale persistence to the session store.
- `src/app/components/AppNavBarLink.vue` — Renders a single desktop navigation-bar entry: a text button (Vuetify `v-btn`) that displays a lucide glyph followed by a full translated label, with an optional count badge anchored over the glyph. It exists as the text-based counterpart to `AppNavIconButton`, where the visible label itself serves as the accessible name (no `aria-label` or tooltip needed).
- `src/app/components/AppNavIconButton.vue` — Renders a single icon-only entry in the app's navigation bar as either a `<v-btn>` or a router link (`<v-btn :to>`), wrapped in a Vuetify tooltip and optional badge. Exists so every glyph in the bar carries a proper accessible name (tooltip text = `aria-label`) and so parents can attach menu-activator props without the component swallowing them.
- `src/app/components/AppNavMenu.vue` — Generic dropdown-menu shell that wraps an `AppNavIconButton` activator and renders a list of `AppNavItem` entries inside a Vuetify `v-menu` with proper ARIA menu semantics (`role="menu"` / `menuitem`). A single component powers both the account menu and the admin menu, giving them an identical keyboard contract and visual structure.
- `src/app/components/AppNavPinnedButton.vue` — Renders a single pinned entry in the app navigation bar: a glyph with an optional count badge and an optional live detail string (e.g. a cart total). It exists to give the nav bar a richer, information-dense button variant beyond the plain icon button, while keeping a single, width-independent accessible name.
- `src/app/components/AppNavigation.vue` — The app-shell navigation component. It merges the shell's own two nav entries (Home, About) with entries contributed by every enabled module (via the kernel registry), filters the combined set by the current visitor's access rights, and renders the result as the desktop icon-and-label bar, the account/admin dropdown menus, the `pinned` buttons beside the account menu, and the mobile phone drawer. The shell knows nothing about specific domains; deleting a module removes its menu entry automatically.
- `src/app/components/StaticPageLinks.vue` — Renders the cross-link footer shared by all four static prose pages (About, FAQ, Terms, Privacy). Given the name of the page currently in view, it displays RouterLinks to the remaining three, guaranteeing the set of sibling links stays consistent across pages.
- `src/app/guards/authentications.ts` — Centralises all route-level access control logic so that the router guard and the navigation UI share a single source of truth for "who may see/use this route." It also handles silent session rehydration (token refresh + viewer load) before any access decision is made, ensuring a stale page load never misclassifies an authenticated user as a guest.
- `src/app/guards/locale-choice.ts` — A Vue Router `beforeResolve` guard that keeps the active i18n language in sync with the `:locale` route parameter. On first use of a locale it loads the bundled JSON dictionary, merges remote overrides, registers the messages, and activates the language. When the param is missing or unsupported it redirects to the same route with the default locale injected.
- `src/app/layouts/LayoutDefault.vue` — The universal page shell that every view renders through. It provides the skip link, health banner, navigation, page hero, footer with legal links, a confirmation-dialog host, a toast stack, and two loading indicators — while deliberately preloading no domain-specific data.
- `src/app/router/announcer.ts` — A small, router-owned state module that lets the router communicate two one-off signals to the layout: the new page title (for a visually-hidden live region) and a pending focus request for `<v-main>`. It exists so the router can write these values in `afterEach` without coupling to a global store, and so the correct (new) layout instance can consume the focus request after a route swap.
- `src/app/router/index.ts` — The application's single Vue Router instance. It wires locale-prefixed routes, merges all domain routes contributed by enabled modules via the kernel registry (naming no domain itself), and registers the global guards that restore auth, enforce access, sync the i18n locale, and manage post-navigation concerns (tab title, a11y announcement, focus).
- `src/app/router/navigation.ts` — Defines the sign-in and sign-up route name constants and provides helpers for building a "continue here after login" redirect location. It exists as a thin, dependency-free bridge so that the app shell can reference authentication routes without importing the (potentially absent) account module.
- `src/app/utils/static-pages.ts` — Single source of truth for the shop's static prose pages (about, FAQ, terms, privacy). It defines the canonical page list, the type for individual page names, the formula that maps a page name to its router route name, and a helper that resolves i18n paragraph arrays into rendered strings. The router, footer, and cross-linking pages all read from here so the mapping exists in exactly one place.
- `src/app/views/AboutPage.vue` — The shop's "About" page. It renders a static informational layout (intro, feature grid, tech-stack list, walkthrough with CTAs) where every visible string is pulled from the i18n dictionary under `static-pages.about.*`. The file owns only the structure, the icon/key mappings, and the conditional CTA visibility logic.
- `src/app/views/Error.vue` — A generic, single-purpose error page rendered when the router redirects to an error state. It displays a status code and a message (either an i18n key or free-form router error text) inside the default layout, and offers a "Home" button to recover.
- `src/app/views/FaqPage.vue` — Renders the shop's FAQ as a series of topic headings, each followed by an accordion of question/answer pairs. All visible copy is pulled from i18n (`static-pages.faq.*`); this file only declares topic keys, their order, and the layout. A conditional contact CTA appears at the bottom when the Contact route is present in the build.
- `src/app/views/Home.vue` — The app's landing page. Renders a static hero card (title, description, optional CTA) and a three-card showcase grid, all translated via i18n. The CTA link is conditionally hidden when the `products` domain is excluded from the build.
- `src/app/views/PrivacyPage.vue` — Renders the site's privacy-policy page as a dedicated component. It exists separately from any shared paragraph renderer because real policy copy will require richer structure (headings, lists, data-category tables) that a generic renderer does not support.
- `src/app/views/TermsPage.vue` — Renders the site's Terms of Service page. It exists as a standalone component (rather than reusing a generic paragraph renderer) because legal copy requires its own structural concerns. The actual legal text is not yet written — placeholder Lorem Ipsum strings live in i18n resources and are expected to be replaced before launch.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
