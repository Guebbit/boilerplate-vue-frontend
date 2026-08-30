# src/app/components/AppNavigation.vue

## Purpose

The app shell's top navigation bar and mobile drawer. It merges the shell's own two entries (Home, StaticAbout) with every entry contributed by enabled modules (collected via the kernel registry), filters each section by `canAccess`, and renders the result as the desktop icon bar, the account/admin dropdown menus, and the mobile hamburger drawer.

## Key elements

- **`shellNavEntries`** – The two navigation entries owned by the shell itself (`Home`, `StaticAbout`); all others come from modules.
- **`navSections`** – Result of `groupNavigation([...shellNavEntries, ...collectModuleNavigation(enabledModules)])`, yielding entries keyed by section (`main`, `account`, `admin`).
- **`badgeCounts`** – A `Map` that materialises each entry's `badge()` accessor **once** at setup, preventing re-armed watchers/fetches on every recompute of the downstream computed.
- **`visibleSections`** – Computed that filters entries via `canAccess` (reading the resolved route's `meta.access`), localizes labels with `t(label, plural ?? 1)`, builds locale-prefixed `to` links, and unwraps badge values for reactivity.
- **`accountBadge`** – Single number shown on the closed account-menu activator (first badged entry wins).
- **`hasSignIn` / `hasSignUp`** – Computed `router.hasRoute(...)` checks; a build without the account module simply hides the auth buttons.
- **`drawer` / `hamburger` / focus watcher** – Mobile drawer open state plus a `watch` that moves focus into the drawer on open and back to the hamburger on close (WCAG 2.4.3), using `nextTick` because the DOM isn't updated yet.
- **`toggleTheme`** – Flips Vuetify's global theme between `light` and `dark` (initial state follows OS via `system`).
- **Template** – A single `<v-app-bar>` with: prepend (hamburger + logo), a `nav` of `AppNavIconButton`s for `visibleSections.main`, a default slot, and append containing the admin menu, auth buttons, account menu (with logout appended via `#after` slot), theme toggle, and `AppLanguageSwitcher`.

## Relationships

- **`src/kernel/registry.ts`** – Imports `collectModuleNavigation`, `groupNavigation`, `NAVIGATION_SECTIONS`, and the types `AppNavigationEntry` / `AppNavigationSection`. The shell calls `collectModuleNavigation(enabledModules)` to pull every enabled module's nav entries, then `groupNavigation` to bucket them into the three sections it renders. The shell defines the section vocabulary; modules choose where their entry sits via the `section` field on `AppNavigationEntry`.

## Notes

- **Badge `||` vs `??`:** `badgeCounts.get(name)?.value || undefined` is deliberate—a `0` badge must disappear, and `??` would keep it. An eslint disable documents this.
- **No visibility flag on entries:** Access control is derived from the *resolved route's* `meta.access` at render time, not from a static flag on the entry. A section whose every entry is out of reach yields an empty list, and the corresponding chrome (admin menu, drawer heading) simply does not render.
- **`plural` is optional:** Modules that omit it get the singular form via `plural ?? 1`.
- **Auth buttons use `v-if`, not `v-show`:** A hidden-but-present button remains in the tab order and is focusable by assistive tech.
- **`hasSignIn`/`hasSignUp` use route names (strings):** These are not type-checked; they are a runtime probe so the shell stays agnostic to whether the account module is installed.
- **`baseUrl` from `import.meta.env.BASE_URL`:** Used to resolve the logo image from `public/` regardless of the app's mount path.
