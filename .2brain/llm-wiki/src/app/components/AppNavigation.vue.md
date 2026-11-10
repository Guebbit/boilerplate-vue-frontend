---
source: src/app/components/AppNavigation.vue
sha256: e611e2db0108bd38544dd609a48b1d4050e797d6b4f19e3ef6eacb43ad121c59
signature: b5ed50fb609569ba32e72d43099c1c8eaf38d9d9a2d640ecd7649e82b0de2ea1
generated_at: 2026-11-10T02:50:53.124461+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavigation.vue

## Purpose

Renders the application shell's navigation chrome: the desktop app bar (logo, nav links, account/admin menus, pinned buttons) and the mobile phone drawer. It merges the shell's own two entries (Home, About) with whatever entries enabled modules contribute through the kernel registry, filters them through the `canAccess` guard so the UI mirrors exactly what the router would allow, and presents the result across three sections (`main`, `account`, `admin`).

## Key elements

- **`shellNavEntries`** — The two nav items the shell owns (Home, StaticAbout), spaced by `order` tens so module entries can interleave.
- **`navSections`** — Shell entries + `collectModuleNavigation(enabledModules)`, grouped into `main` / `account` / `admin` via `groupNavigation`.
- **`badgeCounts` / `badgeDetails`** — Maps of entry name → reactive ref, materialised once at setup time (not inside a computed) to avoid re-arming watchers/fetches on every recompute.
- **`visibleSections`** — Per-section filtered + localized `AppNavItem[]`; each entry is checked against `canAccess` using the resolved route's `meta`, and badged entries are unwrapped (zero is coerced to `undefined` so no chip renders).
- **`pinnedItems` / `menuItems`** — Splits account/admin entries into bar-level buttons (`pinned: true`) and dropdown rows (the rest).
- **`accountBadge`** — The single count shown on the closed account-menu activator (first badged entry wins).
- **`hasSignIn` / `hasSignUp`** — `router.hasRoute` checks so auth buttons appear only when the account module's routes actually exist.
- **`logout`** — Navigates to the `Logout` route if present, otherwise falls back to `Home`.
- **`toggleTheme`** — Flips Vuetify's light/dark mode, persists via `writeThemePreference`, and logs failures through `logger.error`.
- **`showWelcomeTour`** — Pushes `?tour=WELCOME_TOUR_ID` onto the current query; `AppTourHost` picks it up.
- **Drawer focus management** — A `watch` on the `drawer` ref moves focus into the drawer on open and back to the hamburger on close (next-tick, per WCAG 2.4.3).
- **`appBarSlot`** — A kernel slot (`useSlot('app-bar')`) where modules inject extra bar items (e.g. a notifications bell).

## Relationships

- Consumes the kernel registry (`collectModuleNavigation`, `groupNavigation`, `NAVIGATION_SECTIONS`) and the session store (`useSessionStore`) to build and filter the nav model.
- Renders child components: `AppNavMenu`, `AppNavBarLink`, `AppNavPinnedButton`, `AppLanguageSwitcher`.
- Reads branding (`brandLogoSource`), i18n routing (`routerLinkI18n`), runtime config (`readToursEnabled`), and tour catalogue (`WELCOME_TOUR_ID`).

## Notes

- **Badge unwrapping uses `||` not `??`**: a zero count must render as *no* badge; `??` would pin a "0" chip on the menu.
- **`badgeCounts` / `badgeDetails` are `Map`s, not computeds**, specifically so the accessor (which may start watchers or fetches, e.g. a cart count) runs exactly once at setup.
- **No visibility flag on entries**: access is derived entirely from the resolved route's `meta` + the visitor's capabilities. A section whose every entry is filtered out simply renders no chrome for it.
- **`order` spacing by tens** (10, 99 for shell; modules pick their own) lets shell and module entries interleave without renumbering.
- **Drawer focus uses a query-selector** (`#${DRAWER_ID} a[href], ...`) rather than a template ref, because the drawer's content is rendered by a child component after the flag flips.
- **Theme toggle is optimistic**: if `theme.change()` rejects, the page stays on the old theme but the preference is already persisted for the next reload.
