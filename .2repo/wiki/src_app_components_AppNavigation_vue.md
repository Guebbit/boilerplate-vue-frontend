# src/app/components/AppNavigation.vue

## Purpose

The app-shell navigation component. It merges the shell's own two nav entries (Home, About) with entries contributed by every enabled module (via the kernel registry), filters the combined set by the current visitor's access rights, and renders the result as the desktop icon-and-label bar, the account/admin dropdown menus, the `pinned` buttons beside the account menu, and the mobile phone drawer. The shell knows nothing about specific domains; deleting a module removes its menu entry automatically.

## Key elements

- **`shellNavEntries`** — the two entries the shell owns (Home, StaticAbout), declared with `order` values spaced by tens so module entries can interleave.
- **`hasSignIn` / `hasSignUp`** — computed flags that check `router.hasRoute(...)` rather than assuming the account module is present; a build without it simply hides auth buttons.
- **`navSections`** — the full entry list grouped into `main`, `account`, `admin` via `groupNavigation`.
- **`badgeCounts` / `badgeDetails`** — `Map`s materialised **once** (not inside a computed) so accessor-side watchers/fetches are not re-armed on every recompute.
- **`visibleSections`** — computed that filters entries through `canAccess`, localises labels, resolves `routerLinkI18n` targets, and unwraps badge/detail refs.
- **`pinnedItems` / `menuItems`** — split the account and admin sections: pinned entries become standalone bar buttons; the rest go into the dropdown menus (no duplicates).
- **`accountBadge`** — the single badge shown on the closed account-menu activator (first badged entry wins).
- **`logout`** — navigates to the `Logout` route.
- **`toggleTheme`** — flips Vuetify's global theme between light and dark.
- **Drawer focus management** — a `watch` on `drawer` moves focus to the first focusable child on open and back to the hamburger button on close (`nextTick` + `DRAWER_ID` query), satisfying WCAG 2.4.3.
- **Slots** — `default` (bar centre), `nav-left`, `nav-right` allow pages to inject extra bar content.

## Relationships

The dependency graph reports no recorded neighbors for this file. (In practice the file imports from `AppNavMenu`, `AppNavBarLink`, `AppNavPinnedButton`, `AppLanguageSwitcher`, the session store, the kernel registry, the i18n helpers, and the router navigation utilities, but none of these edges appear in the provided graph.)

## Notes

- **`||` vs `??` for badges:** the code deliberately uses `||` so a badge value of `0` renders as *no* badge; `??` would pin a visible "0" chip. An eslint-disable comment marks this.
- **`v-if` not `v-show`** on auth buttons: a `v-show`-hidden `<button>` stays in the tab order, creating an invisible focus stop. `v-if` removes it from the DOM entirely.
- **Badge/detail accessors are called once at setup time**, not inside the `visibleSections` computed. If a module's accessor starts watchers or fetches (e.g. the cart count), calling it inside a reactive computed would re-arm them on every recompute.
- **`plural` is optional** on the manifest; a module that omits it falls back to `1` (singular), matching pre-field behaviour.
- **`baseUrl`** (`import.meta.env.BASE_URL`) is prepended to the logo `src` so the asset resolves correctly when the app is served from a non-root path.
- **Order values are spaced by tens** (10, 99 for shell; modules pick their own) to allow interleaving without renumbering.
