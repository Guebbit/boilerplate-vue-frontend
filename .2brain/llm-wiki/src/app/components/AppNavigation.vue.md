---
source: src/app/components/AppNavigation.vue
sha256: 9151aed6acf335de2358e09cd3918e7947426615e5fef761bb587873425916f3
generated_at: 2026-10-02T11:45:10.594454+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavigation.vue

## Purpose
Renders the app shell's navigation bar (desktop) and phone drawer (mobile). It merges the shell's own two entries (Home, About) with navigation entries contributed by enabled modules via the kernel registry, filters every entry through the `canAccess` guard, and presents the result as a flat icon+label bar, account/admin dropdown menus, pinned buttons, and a hamburger-triggered drawer. Deleting a domain module removes its menu entry automatically.

## Key elements
- **`shellNavEntries`** – the two nav entries the shell owns (`Home`, `StaticAbout`); ordered by tens so module entries can interleave.
- **`navSections`** – all entries (shell + `collectModuleNavigation(enabledModules)`) grouped into `main` / `account` / `admin` via `groupNavigation`.
- **`badgeCounts` / `badgeDetails`** – Maps that materialise each entry's optional `badge()` / `detail()` accessor exactly once (avoids re-arming watchers/fetches on every computed re-evaluation).
- **`visibleSections`** – per-section filtered + i18n-ized list; resolves each route's `meta.access` through `canAccess` so the menu mirrors what the router would actually allow.
- **`pinnedItems`** – entries flagged `pinned` in either the account or admin section; rendered as standalone buttons beside the menus.
- **`menuItems`** – account/admin entries minus pinned ones (prevents double display).
- **`accountBadge`** – the single number shown on the account-menu activator (first badged entry wins).
- **`hasSignIn` / `hasSignUp`** – computed `router.hasRoute(...)` checks; a build without the account module simply hides auth buttons.
- **`logout()`** – pushes to `Logout` route if it exists, otherwise falls back to `Home` (avoids a vue-router throw on an unresolvable name).
- **`toggleTheme()`** – flips Vuetify light/dark and persists the choice via `writeThemePreference`.
- **Drawer focus management** – a `watch` on the `drawer` ref moves focus to the first focusable element on open and back to the hamburger on close (WCAG 2.4.3).
- **Slots** – `nav-left`, default, and `nav-right` let page-level content inject into the bar.

## Notes
- **Materialise-once rule for accessors:** `badge()` and `detail()` are invoked in plain `Map` construction, not inside the `visibleSections` computed, because a re-running computed would re-arm any watchers/fetches the accessor starts (e.g. the cart count).
- **Badge zero handling:** the code uses `||` (not `??`) when unwrapping badge values so that a legitimate `0` renders as "no badge" rather than a "0" chip.
- **`v-if` vs `v-show` for auth links:** the login/signup buttons use `v-if` so a hidden button does not remain in the tab order.
- **`routerLinkI18n`** wraps every `:to` value, prefixing the locale; never pass a bare `{ name }` to a `RouterLink` in this component.
- **No domain knowledge:** the shell references module routes only by string name resolved at runtime; it never imports a domain store or component directly.
- **Template is truncated** in the source snapshot; the mobile drawer (`#DRAWER_ID = 'app-drawer'`) and the language switcher / theme-toggle buttons live in the portion not shown here but are wired by the script.
